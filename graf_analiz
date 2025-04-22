using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

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

    // Çift yönlü arkadaşlık ekleme
    public void AddFriendship(int userId1, int userId2, int weight)
    {
        if (!Users.ContainsKey(userId1))
        {
            Users[userId1] = new UserNode(userId1, $"User{userId1}");
        }
        if (!Users.ContainsKey(userId2))
        {
            Users[userId2] = new UserNode(userId2, $"User{userId2}");
        }

        Users[userId1].AddFriend(userId2, weight);
        Users[userId2].AddFriend(userId1, weight);
    }

    // Dosyadan graf oluşturma
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

    // Rastgele graf oluşturma (test etmek icin kullanacağım)
    //kullanıcı ve kenar sayısını alması gerekiyo
    public void GenerateRandomGraph(int userCount, int edgeCount)
    {
        Random rand = new Random();
        for (int i = 1; i <= userCount; i++)
        {
            Users[i] = new UserNode(i, $"User{i}");
        }

        for (int i = 0; i < edgeCount; i++)
        {
            int user1 = rand.Next(1, userCount + 1);
            int user2 = rand.Next(1, userCount + 1);
            
            if (user1 == user2) continue; // Kendi kendine arkadaşlık olmaması lazım!!
            
            int weight = rand.Next(1, 10);
            AddFriendship(user1, user2, weight);
        }
    }

    // Graf bilgilerini yazan kısım 
    public void PrintGraphInfo()
    {
        Console.WriteLine($"Total Users: {Users.Count}");
        Console.WriteLine($"Total Friendships: {Users.Sum(u => u.Value.Friends.Count) / 2}");
        
        if (Users.Any())
        {
            var sampleUser = Users.First().Value;
            Console.WriteLine($"\nSample User: {sampleUser.Name} has {sampleUser.Friends.Count} friends:");
            foreach (var friend in sampleUser.Friends)
            {
                Console.WriteLine($"- User {friend.Key} (Weight: {friend.Value})");
            }
        }
    }
}

class Program // ana program bu 
{
    
    //  rastgele graf oluşturma seçeneği ekledim 
    // Dijkstra algoritması veya diğer analizleri burada cağıracağım 
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
                string fbPath = Path.Combine(Directory.GetCurrentDirectory(), "facebook_combined.txt"); // bulduğum örnek veri seti buydu 
                if (File.Exists(fbPath))
                {
                    graph.LoadFromFile(fbPath);
                    Console.WriteLine("Facebook dataset loaded successfully.");
                }
                else
                {
                    Console.WriteLine("File not found. Download it from: https://snap.stanford.edu/data/facebook_combined.txt.gz");
                    return;
                }
                break;
                
            case "2":
                Console.Write("Enter file path: ");
                string customPath = Console.ReadLine();
                graph.LoadFromFile(customPath, hasWeight: true);
                break;
                
            case "3":
                Console.Write("Enter user count: ");
                int users = int.Parse(Console.ReadLine());
                Console.Write("Enter edge count: ");
                int edges = int.Parse(Console.ReadLine());
                graph.GenerateRandomGraph(users, edges);
                Console.WriteLine($"Random graph with {users} users and {edges} edges generated.");
                break;
                
            default:
                Console.WriteLine("Invalid option.");
                return;
        }
        
        Console.WriteLine("\nGraph Information:");
        graph.PrintGraphInfo();
        
        
    }
}
