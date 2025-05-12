//API Endpoint'leri

using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class AnalysisController : ControllerBase
{
    private readonly SocialGraph _graph;

    public AnalysisController(SocialGraph graph)
    {
        _graph = graph;
    }

    
    [HttpGet("shortest-path")] // en kısa yolu bulacak 
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

    
    //Tüm kullanıcılar için betweenness centrality hesapla
 
    [HttpGet("betweenness-centrality")]
    public IActionResult CalculateBetweenness()
    {
        var result = _graph.CalculateBetweennessCentrality();
        return Ok(new {
            Scores = result,
            Status = "Success"
        });
    }

   //toplulukları bulacak 
    [HttpGet("detect-communities")]
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
