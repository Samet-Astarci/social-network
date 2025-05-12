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

    public void AddFriendship(int userId1, int userId2, int weight)
    {
        if (userId1 == userId2) return; // kendisiyle olmasın

        if (!Users.ContainsKey(userId1))
            Users[userId1] = new UserNode(userId1, $"User {userId1}");
        if (!Users.ContainsKey(userId2))
            Users[userId2] = new UserNode(userId2, $"User {userId2}");

        Users[userId1].AddFriend(userId2, weight);
        Users[userId2].AddFriend(userId1, weight);
    }

    public void LoadFromFile(string filePath, bool hasWeight = false)
    {
        if (!File.Exists(filePath))
        {
            Console.WriteLine($"Dosya bulunamadı: {filePath}");
            return;
        }

        try
        {
            foreach (var line in File.ReadLines(filePath))
            {
                if (string.IsNullOrWhiteSpace(line)) continue;

                var parts = line.Split(new[] { ' ', '\t' }, StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length < 2) continue;

                if (!int.TryParse(parts[0], out int user1) ||
                    !int.TryParse(parts[1], out int user2))
                    continue;

                int weight = 1;
                if (hasWeight && parts.Length >= 3 && int.TryParse(parts[2], out int w))
                    weight = w;

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
        var rand = new Random();
        Users.Clear();
        for (int i = 1; i <= userCount; i++)
            Users[i] = new UserNode(i, $"User {i}");

        int created = 0;
        while (created < edgeCount)
        {
            int u1 = rand.Next(1, userCount + 1);
            int u2 = rand.Next(1, userCount + 1);
            if (u1 == u2) continue;
            int w = rand.Next(1, 10);
            // eğer zaten varsa ekleme
            if (Users[u1].Friends.ContainsKey(u2)) continue;
            AddFriendship(u1, u2, w);
            created++;
        }
    }

    public void PrintGraphInfo()
    {
        Console.WriteLine($"Total Users      : {Users.Count}");
        Console.WriteLine($"Total Friendships: {Users.Sum(u => u.Value.Friends.Count) / 2}");
        Console.WriteLine();

        if (Users.Any())
        {
            var sample = Users.First().Value;
            Console.WriteLine($"--- Sample User: {sample.Name} ---");
            foreach (var f in sample.Friends)
                Console.WriteLine($"Friend: User {f.Key} (Weight: {f.Value})");
        }
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
        Console.Write("Select an option (1-3): ");

        if (!int.TryParse(Console.ReadLine(), out int choice))
        {
            Console.WriteLine("Geçersiz seçim. Program sonlanıyor.");
            return;
        }

        switch (choice)
        {
            case 1:
                {
                    string fbFile = Path.Combine(Directory.GetCurrentDirectory(), "facebook_combined.txt");
                    Console.WriteLine($"Loading from {fbFile} (weights assumed 1)...");
                    graph.LoadFromFile(fbFile, hasWeight: false);
                }
                break;
            case 2:
                {
                    Console.Write("Enter custom file name (with .txt): ");
                    string custom = Console.ReadLine()?.Trim();
                    string customPath = Path.Combine(Directory.GetCurrentDirectory(), custom);
                    Console.WriteLine($"Loading from {customPath} (with weights)...");
                    graph.LoadFromFile(customPath, hasWeight: true);
                }
                break;
            case 3:
                {
                    Console.Write("User count: ");
                    int uc = int.TryParse(Console.ReadLine(), out int ucTmp) ? ucTmp : 100;
                    Console.Write("Edge count: ");
                    int ec = int.TryParse(Console.ReadLine(), out int ecTmp) ? ecTmp : 200;
                    graph.GenerateRandomGraph(uc, ec);
                }
                break;
            default:
                Console.WriteLine("Seçim 1-3 arasında olmalı. Çıkış yapılıyor.");
                return;
        }

        Console.WriteLine();
        graph.PrintGraphInfo();
    }
}
