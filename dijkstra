using System;
using System.Collections.Generic;
using System.Linq;

public class ShortestPathResult // Dijkstra algoritması ile  en kısa yolu bulacağım 
{
    public List<int> Path { get; set; }
    public int TotalWeight { get; set; }
    
    public override string ToString()
    {
        return $"Path: {string.Join(" -> ", Path)}, Total Weight: {TotalWeight}";
    }
}

public class SocialGraph
{
    /* önceki social graph sınıfını kullanmam gerek diye ekliyorum

    public Dictionary<int, User> Users { get; set; } = new Dictionary<int, User>();
    public class User
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public Dictionary<int, int> Friends { get; set; } = new Dictionary<int, int>(); // Arkadaşlar ve ağırlıkları
    }
    public void AddUser(int id, string name)
    {
        if (!Users.ContainsKey(id))
        {
            Users[id] = new User { Id = id, Name = name };
        }
    }
    public void AddFriendship(int userId1, int userId2, int weight)
    {
        if (Users.ContainsKey(userId1) && Users.ContainsKey(userId2))
        {
            Users[userId1].Friends[userId2] = weight;
            Users[userId2].Friends[userId1] = weight; // İki yönlü bağlantı
        }
    }
    public void RemoveFriendship(int userId1, int userId2)
    {
        if (Users.ContainsKey(userId1) && Users.ContainsKey(userId2))
        {
            Users[userId1].Friends.Remove(userId2);
            Users[userId2].Friends.Remove(userId1); // İki yönlü bağlantı
        }
    }
    public void RemoveUser(int userId)
    {
        if (Users.ContainsKey(userId))
        {
            foreach (var friendId in Users[userId].Friends.Keys.ToList())
            {
                Users[friendId].Friends.Remove(userId);
            }
            Users.Remove(userId);
        }
    }
    public void PrintGraph()
    {
        foreach (var user in Users.Values)
        {
            Console.Write($"{user.Name} ({user.Id}): ");
            foreach (var friend in user.Friends)
            {
                Console.Write($"[{Users[friend.Key].Name} ({friend.Key}), {friend.Value}] ");
            }
            Console.WriteLine();
        }
    }
   
    */

    // Dijkstra algoritması ile en kısa yolu bulma
    
    public ShortestPathResult Dijkstra(int startUserId, int targetUserId)
    {
        if (!Users.ContainsKey(startUserId) || !Users.ContainsKey(targetUserId))
        {
            throw new ArgumentException("Invalid user IDs");
        }

        // Başlangıç noktasından diğer tüm noktalara olan mesafeler
        var distances = new Dictionary<int, int>();
        // Önceki düğümleri takip etmek için kullanmalıyım (hata düzeltildi)
        var previous = new Dictionary<int, int?>();
        // Henüz ziyaret edilmemiş düğümler (hata düzeltildi)
        var unvisited = new HashSet<int>();

        foreach (var userId in Users.Keys)
        {
            distances[userId] = userId == startUserId ? 0 : int.MaxValue;
            previous[userId] = null;
            unvisited.Add(userId);
        }

        while (unvisited.Count > 0)
        {
            // En küçük mesafeye  sahip düğümü bul
            var currentUserId = unvisited.OrderBy(u => distances[u]).First();
            unvisited.Remove(currentUserId);

            // Hedefe ulaştık mı 
            if (currentUserId == targetUserId)
            {
                break;
            }

            // Komşuları kontrol et
            foreach (var neighbor in Users[currentUserId].Friends)
            {
                var neighborId = neighbor.Key;
                var edgeWeight = neighbor.Value;
                var alt = distances[currentUserId] + edgeWeight;

                if (alt < distances[neighborId])
                {
                    distances[neighborId] = alt;
                    previous[neighborId] = currentUserId;
                }
            }
        }

        // Yolu geriye doğru oluştur (hata düzeltildi)
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
}

// görselleştirme kısmı ekstra olarak ekledim 
public void VisualizePath(ShortestPathResult result)
{
    Console.WriteLine("\nYol Görselleştirme:");
    for (int i = 0; i < result.Path.Count; i++)
    {
        Console.Write(Users[result.Path[i]].Name);
        if (i < result.Path.Count - 1)
        {
            var weight = Users[result.Path[i]].Friends[result.Path[i + 1]];
            Console.Write($" --({weight})--> ");
        }
    }
    Console.WriteLine($"\nToplam Ağırlık: {result.TotalWeight}");
}
