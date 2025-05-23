//Tam Implementasyon - Sosyal Ağ Analiz API'si (Tek Dosya)


using Microsoft.AspNetCore.Mvc;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Swagger konfigürasyonu
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { 
        Title = "Social Network Analysis API", 
        Version = "v1",
        Description = "Dijkstra, Betweenness Centrality ve Community Detection API"
    });
});

builder.Services.AddControllers();

// SocialGraph servisini ekle
builder.Services.AddSingleton<SocialGraph>(provider => 
{
    var graph = new SocialGraph();
    LoadSampleData(graph); // Test verilerini yükle
    return graph;
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.Run();

// Facebook benzeri veri yükleme fonksiyonu - test verisi
void LoadFacebookData(SocialGraph graph)
{
    // Facebook benzeri örnek verisi
    int[,] edges = {
       {1, 2}, {1, 3}, {1, 4}, {2, 3}, {2, 5}, {3, 4}, {3, 6},
        {4, 5}, {4, 6}, {5, 7}, {6, 7}, {6, 8}, {7, 8}, {8, 9},
        {9, 10}, {9, 11}, {10, 11}, {10, 12}, {11, 12}, {12, 13},
        {13, 14}, {13, 15}, {14, 15}, {14, 16}, {15, 16}, {16, 17},
        {17, 18}, {18, 19}, {19, 20}, {20, 21}, {21, 22}, {22, 23},
      {23, 24}, {24, 25}, {25, 26}, {26, 27}, {27, 28}, {28, 29},
        {29, 30}, {30, 31}, {31, 32}, {32, 33}, {33, 34}, {34, 35}
    };

    for (int i = 0; i < edges.GetLength(0); i++)
   {
        graph.AddFriendship(edges[i, 0], edges[i, 1], 1);
    }
}
// MODELLER
public class UserNode
{
    public int Id { get; }
    public Dictionary<int, int> Friends { get; } // Key: Friend ID, Value: Weight

    public UserNode(int id)
    {
        Id = id;
        Friends = new Dictionary<int, int>();
    }
}

public class ShortestPathResult
{
    public List<int> Path { get; set; }
    public int TotalWeight { get; set; }
}

public class CommunityDetectionResult
{
    public Dictionary<int, int> Communities { get; set; }
    public double Modularity { get; set; }
}

// ANA GRAF SINIFI
public class SocialGraph
{
    public Dictionary<int, UserNode> Users { get; } = new();

    public void AddFriendship(int userId1, int userId2, int weight)
    {
        if (!Users.ContainsKey(userId1)) Users[userId1] = new UserNode(userId1);
        if (!Users.ContainsKey(userId2)) Users[userId2] = new UserNode(userId2);

        Users[userId1].Friends[userId2] = weight;
        Users[userId2].Friends[userId1] = weight;
    }

    // DIJKSTRA ALGORİTMASI
    public ShortestPathResult Dijkstra(int startUserId, int targetUserId)
    {
        var distances = new Dictionary<int, int>();
        var previous = new Dictionary<int, int?>();
        var unvisited = new HashSet<int>();

        foreach (var userId in Users.Keys)
        {
            distances[userId] = userId == startUserId ? 0 : int.MaxValue;
            previous[userId] = null;
            unvisited.Add(userId);
        }

        while (unvisited.Count > 0)
        {
            var currentUserId = unvisited.OrderBy(u => distances[u]).First();
            unvisited.Remove(currentUserId);

            if (currentUserId == targetUserId) break;

            foreach (var neighbor in Users[currentUserId].Friends)
            {
                var alt = distances[currentUserId] + neighbor.Value;
                if (alt < distances[neighbor.Key])
                {
                    distances[neighbor.Key] = alt;
                    previous[neighbor.Key] = currentUserId;
                }
            }
        }

        var path = new List<int>();
        int? current = targetUserId;
        while (current != null)
        {
            path.Add(current.Value);
            current = previous[current.Value];
        }
        path.Reverse();

        return new ShortestPathResult
        {
            Path = path,
            TotalWeight = distances[targetUserId]
        };
    }

    // BETWEENNESS CENTRALITY
    public Dictionary<int, double> CalculateBetweennessCentrality()
    {
        var betweenness = Users.Keys.ToDictionary(k => k, _ => 0.0);
        
        foreach (var s in Users.Keys)
        {
            var stack = new Stack<int>();
            var pred = Users.Keys.ToDictionary(k => k, _ => new List<int>());
            var dist = Users.Keys.ToDictionary(k => k, _ => -1);
            var sigma = Users.Keys.ToDictionary(k => k, _ => 0.0);
            
            dist[s] = 0;
            sigma[s] = 1;
            var queue = new Queue<int>();
            queue.Enqueue(s);

            while (queue.Count > 0)
            {
                var v = queue.Dequeue();
                stack.Push(v);

                foreach (var w in Users[v].Friends.Keys)
                {
                    if (dist[w] < 0)
                    {
                        dist[w] = dist[v] + 1;
                        queue.Enqueue(w);
                    }
                    if (dist[w] == dist[v] + 1)
                    {
                        sigma[w] += sigma[v];
                        pred[w].Add(v);
                    }
                }
            }

            var delta = Users.Keys.ToDictionary(k => k, _ => 0.0);
            while (stack.Count > 0)
            {
                var w = stack.Pop();
                foreach (var v in pred[w])
                {
                    delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
                }
                if (w != s)
                {
                    betweenness[w] += delta[w];
                }
            }
        }

        // Normalizasyon
        double normalize = (Users.Count - 1) * (Users.Count - 2) / 2.0;
        if (normalize > 0)
        {
            foreach (var v in Users.Keys)
            {
                betweenness[v] /= normalize;
            }
        }

        return betweenness;
    }

    // LOUVAIN TOPLULUK TESPİTİ
    public CommunityDetectionResult DetectCommunities()
    {
        var communities = Users.Keys.ToDictionary(k => k, k => k);
        double modularity = 0;
        double totalWeight = Users.Sum(u => u.Value.Friends.Values.Sum()) / 2.0;
        bool changed;
        int iteration = 0;

        do
        {
            changed = false;
            iteration++;
            var newModularity = ComputeModularity(communities, totalWeight);

            foreach (var node in Users.Keys.OrderBy(_ => Guid.NewGuid()))
            {
                var neighborCommunities = GetNeighborCommunities(node, communities);
                var bestCommunity = communities[node];
                double maxDeltaQ = 0;

                foreach (var community in neighborCommunities)
                {
                    double deltaQ = ComputeDeltaModularity(node, community, communities, totalWeight);
                    if (deltaQ > maxDeltaQ)
                    {
                        maxDeltaQ = deltaQ;
                        bestCommunity = community;
                    }
                }

                if (bestCommunity != communities[node])
                {
                    communities[node] = bestCommunity;
                    changed = true;
                    newModularity += maxDeltaQ;
                }
            }

            modularity = newModularity;
            communities = AggregateCommunities(communities);

        } while (changed && iteration < 100);

        return new CommunityDetectionResult
        {
            Communities = communities,
            Modularity = modularity
        };
    }

    private Dictionary<int, int> AggregateCommunities(Dictionary<int, int> communities)
    {
        var uniqueCommunities = communities.Values.Distinct().ToList();
        return communities.ToDictionary(
            k => k.Key,
            v => uniqueCommunities.IndexOf(v.Value)
        );
    }

    private HashSet<int> GetNeighborCommunities(int node, Dictionary<int, int> communities)
    {
        return new HashSet<int>(Users[node].Friends.Keys.Select(n => communities[n]));
    }

    private double ComputeModularity(Dictionary<int, int> communities, double totalWeight)
    {
        double q = 0;
        var communityNodes = communities.GroupBy(x => x.Value)
                                     .ToDictionary(g => g.Key, g => g.Select(x => x.Key));

        foreach (var community in communityNodes)
        {
            foreach (var node1 in community.Value)
            {
                foreach (var node2 in community.Value)
                {
                    if (node1 == node2) continue;
                    
                    int a_ij = Users[node1].Friends.ContainsKey(node2) ? 1 : 0;
                    double k_i = Users[node1].Friends.Count;
                    double k_j = Users[node2].Friends.Count;
                    
                    q += a_ij - (k_i * k_j) / (2 * totalWeight);
                }
            }
        }

        return q / (2 * totalWeight);
    }

    private double ComputeDeltaModularity(int node, int community, 
                                        Dictionary<int, int> communities, 
                                        double totalWeight)
    {
        double sum_in = 0, sum_tot = 0;
        double k_i = Users[node].Friends.Count;
        double k_i_in = Users[node].Friends.Count(f => communities[f.Key] == community);

        foreach (var n in communities.Where(x => x.Value == community).Select(x => x.Key))
        {
            sum_tot += Users[n].Friends.Count;
            sum_in += Users[n].Friends.Count(f => communities[f.Key] == community);
        }

        sum_in /= 2;
        sum_tot /= 2;

        return (sum_in + k_i_in) / (2 * totalWeight) - 
               Math.Pow((sum_tot + k_i) / (2 * totalWeight), 2) -
               (sum_in / (2 * totalWeight) - 
                Math.Pow(sum_tot / (2 * totalWeight), 2) - 
                Math.Pow(k_i / (2 * totalWeight), 2));
    }
}

// CONTROLLER
[ApiController]
[Route("api/[controller]")]
public class AnalysisController : ControllerBase
{
    private readonly SocialGraph _graph;

    public AnalysisController(SocialGraph graph)
    {
        _graph = graph;
    }

    [HttpGet("shortest-path")]
    public IActionResult GetShortestPath([FromQuery] int from, [FromQuery] int to)
    {
        try
        {
            var result = _graph.Dijkstra(from, to);
            return Ok(new {
                Path = result.Path,
                TotalWeight = result.TotalWeight,
                Status = "Success"
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new {
                Status = "Error",
                Message = ex.Message
            });
        }
    }

    [HttpGet("betweenness-centrality")]
    public IActionResult GetBetweennessCentrality()
    {
        var result = _graph.CalculateBetweennessCentrality();
        return Ok(new {
            Scores = result,
            Status = "Success"
        });
    }

    [HttpGet("communities")]
    public IActionResult DetectCommunities()
    {
        var result = _graph.DetectCommunities();
        return Ok(new {
            Modularity = result.Modularity,
            Communities = result.Communities,
            Status = "Success"
        });
    }
}
