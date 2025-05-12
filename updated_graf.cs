//facebook verileriyle olan analizi güncelledim
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;

public class UserNode
{
    public int Id { get; }
    public string Name { get; }
    public Dictionary<int, int> Friends { get; } // Key: Friend ID, Value: Weight

    public UserNode(int id, string name)
    {
        Id = id;
        Name = name;
        Friends = new Dictionary<int, int>();
    }

    public void AddFriend(int friendId, int weight)
    {
        Friends[friendId] = weight;
    }
}

public class SocialGraph
{
    public Dictionary<int, UserNode> Users { get; }

    public SocialGraph()
    {
        Users = new Dictionary<int, UserNode>();
    }

    public void AddFriendship(int userId1, int userId2, int weight)
    {
        if (!Users.ContainsKey(userId1))
        {
            Users[userId1] = new UserNode(userId1, $"User  {userId1}");
        }
        if (!Users.ContainsKey(userId2))
        {
            Users[userId2] = new UserNode(userId2, $"User  {userId2}");
        }

        Users[userId1].AddFriend(userId2, weight);
        Users[userId2].AddFriend(userId1, weight);
    }

    public void LoadFromFile(string filePath, bool hasWeight = false)
    {
        try
        {
            foreach (var line in File.ReadLines(filePath))
            {
                if (string.IsNullOrWhiteSpace(line)) continue;

                var parts = line.Split(new[] { ' ', '\t' }, StringSplitOptions.RemoveEmptyEntries);
                
                if (parts.Length < 2) continue;

                if (!int.TryParse(parts[0], out int user1) || !int.TryParse(parts[1], out int user2))
                    continue;

                int weight = hasWeight && parts.Length >= 3 && int.TryParse(parts[2], out int w) ? w : 1;

                AddFriendship(user1, user2, weight);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error loading file: {ex.Message}");
        }
    }

    public void GenerateRandomGraph(int userCount, int edgeCount)
    {
        Random rand = new Random();
        for (int i = 1; i <= userCount; i++)
        {
            Users[i] = new UserNode(i, $"User  {i}");
        }

        for (int i = 0; i < edgeCount; i++)
        {
            int user1 = rand.Next(1, userCount + 1);
            int user2 = rand.Next(1, userCount + 1);
            
            if (user1 == user2) continue; // Kendi kendine arkadaşlık olmaması lazım
            
            int weight = rand.Next(1, 10);
            AddFriendship(user1, user2, weight);
        }
    }

    public string ExportToJson()
    {
        var nodes = Users.Select(u => new
        {
            id = u.Key,
            size = u.Value.Friends.Count, // Düğüm boyutu
            color = u.Value.Friends.Count > 5 ? "red" : "blue", // Renk
            isTop5 = u.Value.Friends.Count > 5, // Öne çıkan düğüm
            connectionCount = u.Value.Friends.Count
        }).ToList();

        var links = Users.SelectMany(u => u.Value.Friends.Select(f => new
        {
            source = u.Key,
            target = f.Key,
            isTop5Connection = f.Value > 5 // Öne çıkan bağlantı
        })).ToList();

        var result = new { nodes, links };
        return JsonSerializer.Serialize(result);
    }
}

class Program
{
    static void Main(string[] args)
    {
        var graph = new SocialGraph();
        
        Console.WriteLine("1. Load from Facebook dataset (no weights)");
        Console.WriteLine("2. Load from custom file (with weights)");
        Console.WriteLine("3. Generate random graph");
        Console.Write("Select an option: ");
        
        var choice = Console.ReadLine();
        
        switch (choice)
        {
            case "1":
                string fbPath = Path.Combine(Directory.GetCurrentDirectory(), "facebook_combined.txt");
                if (File.Exists(fbPath))
                {
                    graph.LoadFromFile(fbPath);
                    Console.WriteLine("Facebook dataset loaded successfully.");
                }
               
