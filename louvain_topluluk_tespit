using System;
using System.Collections.Generic;
using System.Linq;

//Sosyal ağınızdaki doğal toplulukları belirlemek için Louvain Topluluk Tespit Algoritmasını ekliyorum. 
//  grafı yüksek bağlantılılık gösteren alt gruplara ayıracak. 

public class CommunityDetection
{
    public Dictionary<int, int> Communities { get; private set; }
    public double Modularity { get; private set; }

    public CommunityDetection(Dictionary<int, int> communities, double modularity)
    {
        Communities = communities;
        Modularity = modularity;
    }
}

public class SocialGraph
{
   

    public CommunityDetection DetectCommunities()
    {
        // 1. Başlangıç: Her düğüm kendi topluluğunda bakılmalı 
        var communities = Users.Keys.ToDictionary(user => user, user => user);
        double modularity = 0;
        bool changed;
        int iteration = 0;
        double totalWeight = Users.Sum(u => u.Value.Friends.Values.Sum()) / 2.0;

        do
        {
            changed = false;
            iteration++;
            double newModularity = ComputeModularity(communities, totalWeight);

            // 2. Her düğüm için en iyi topluluğu bul 
            foreach (var node in Users.Keys.OrderBy(x => Guid.NewGuid())) // Rastgele sırala
            {
                var neighborCommunities = GetNeighborCommunities(node, communities);
                var bestCommunity = communities[node];
                double maxDeltaQ = 0;

                // Komşu topluluklarda modularity artışını test et (kontrol edilecek)
                foreach (var community in neighborCommunities)
                {
                    double deltaQ = ComputeDeltaModularity(node, community, communities, totalWeight);
                    if (deltaQ > maxDeltaQ)
                    {
                        maxDeltaQ = deltaQ;
                        bestCommunity = community;
                    }
                }

                // Topluluk değişimi 
                if (bestCommunity != communities[node])
                {
                    communities[node] = bestCommunity;
                    changed = true;
                    newModularity += maxDeltaQ;
                }
            }

            // 3. Yeni topluluk grafları oluşturma (aggregation phase)
            if (changed || iteration == 1)
            {
                modularity = newModularity;
                communities = AggregateCommunities(communities);
            }

        } while (changed && iteration < 100); // Maksimum 100 iterasyon olsun - sonsuz döngüye girmemesi lazım 


        return new CommunityDetection(communities, modularity);
    }

    private Dictionary<int, int> AggregateCommunities(Dictionary<int, int> communities)
    {
        var uniqueCommunities = communities.Values.Distinct().ToList();
        var newCommunities = new Dictionary<int, int>();
        var communityMap = uniqueCommunities.ToDictionary(c => c, c => uniqueCommunities.IndexOf(c));
        
        foreach (var node in communities.Keys)
        {
            newCommunities[node] = communityMap[communities[node]];
        }
        
        return newCommunities;
    }

    private HashSet<int> GetNeighborCommunities(int node, Dictionary<int, int> communities)
    {
        var result = new HashSet<int>();
        foreach (var neighbor in Users[node].Friends.Keys)
        {
            result.Add(communities[neighbor]);
        }
        return result;
    }

    private double ComputeModularity(Dictionary<int, int> communities, double totalWeight)
    {
        double q = 0;
        var communityNodes = communities.GroupBy(x => x.Value)
                                       .ToDictionary(g => g.Key, g => g.Select(x => x.Key).ToList());

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
        double sum_in = 0;    // Topluluk içi bağlantılar
        double sum_tot = 0;    // Topluluğun toplam bağlantıları
        double k_i = Users[node].Friends.Count;
        double k_i_in = 0;

        foreach (var neighbor in Users[node].Friends.Keys)
        {
            if (communities[neighbor] == community)
            {
                k_i_in++;
            }
        }

        foreach (var n in communities.Where(x => x.Value == community).Select(x => x.Key))
        {
            sum_tot += Users[n].Friends.Count;
            foreach (var neighbor in Users[n].Friends.Keys)
            {
                if (communities[neighbor] == community)
                {
                    sum_in++;
                }
            }
        }

        sum_in /= 2;  // Çift saymayı önlemek icin 
        sum_tot /= 2;

        double deltaQ = (sum_in + k_i_in) / (2 * totalWeight) - 
                       Math.Pow((sum_tot + k_i) / (2 * totalWeight), 2);
        
        deltaQ -= sum_in / (2 * totalWeight) - 
                 Math.Pow(sum_tot / (2 * totalWeight), 2) - 
                 Math.Pow(k_i / (2 * totalWeight), 2);

        return deltaQ;
    }
}

