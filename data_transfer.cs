/*Facebook API'den veri almak için Graph API'yi kullanarak kullanıcı verilerini ve ilişkilerini entegre etmeye çalıştım.
  kimlik doğrulaması yaparak API çağrıları yapmayı ve elde edilen verileri mevcut veri yapısına dönüştürmeyi içeriyor 
*/



using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

class SocialGraph
{
    private Dictionary<int, List<int>> friendships = new Dictionary<int, List<int>>();

    public void AddFriendship(int userId1, int userId2, int weight)
    {
        if (!friendships.ContainsKey(userId1))
        {
            friendships[userId1] = new List<int>();
        }
        friendships[userId1].Add(userId2);
    }


    public async Task LoadFacebookData(string accessToken)
    {
        var facebookEdges = await FetchFacebookData(accessToken);
        foreach (var edge in facebookEdges)
        {
            AddFriendship(edge.userId1, edge.userId2, 1);
        }
    }

    private async Task<List<(int userId1, int userId2)>> FetchFacebookData(string accessToken)
    {
        var edges = new List<(int userId1, int userId2)>();
        using (var client = new HttpClient())
        {
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
            var response = await client.GetStringAsync("https://graph.facebook.com/v8.0/me/friends?access_token=" + accessToken);
            var json = JObject.Parse(response);
            foreach (var friend in json["data"])
            {
                int userId1 = (int)friend["id"];
                int userId2 = GetUserIdFromFriend(friend);
                edges.Add((userId1, userId2));
            }
        }
        return edges;
    }

    private int GetUserIdFromFriend(JToken friend)
    {
        return (int)friend["id"]; // Placeholder
    }

    public void DisplayFriendships()
    {
        foreach (var user in friendships)
        {
            Console.WriteLine($"User  {user.Key} has friends: {string.Join(", ", user.Value)}");
        }
    }
}

class Program
{
    static async Task Main(string[] args)
    {
        var socialGraph = new SocialGraph();
        string accessToken = "YOUR_ACCESS_TOKEN"; // Replace with your actual access token
        await socialGraph.LoadFacebookData(accessToken);
        socialGraph.DisplayFriendships();
    }
}
