//test verisi böyle yüklenecek 


public static class GraphExtensions
{
    public static void LoadSampleData(this SocialGraph graph)
    {
        // Örnek graf verisi (Zachary's Karate Club)
        graph.AddFriendship(1, 2, 1);
        graph.AddFriendship(1, 3, 1);
        graph.AddFriendship(2, 3, 1);
        // ... Tüm kenarları ekleyin
    }
}