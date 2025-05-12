using System;
using System.Collections.Generic;
using System.Linq;

public class SocialGraph
{
    

    public Dictionary<int, double> CalculateBetweennessCentrality()
    {
        var betweenness = new Dictionary<int, double>();
        var nodes = Users.Keys.ToList();

        // Tüm düğümler için betweenness değerini sıfırla ( sebep: 
        // her düğüm için betweenness hesaplanacak )
        foreach (var node in nodes)
        {
            betweenness[node] = 0.0;
        }

        foreach (var s in nodes)
        {
            // ön işlemleri ekledim (hata düzeltildi)
            var stack = new Stack<int>();
            var pred = new Dictionary<int, List<int>>();
            var dist = new Dictionary<int, int>();
            var sigma = new Dictionary<int, double>();

            foreach (var v in nodes)
            {
                pred[v] = new List<int>();
                dist[v] = -1;
                sigma[v] = 0.0;
            }

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
                    // w düğümüne ilk kez ulaşılıyorsa
                    if (dist[w] < 0)
                    {
                        dist[w] = dist[v] + 1;
                        queue.Enqueue(w);
                    }

                    // v'den w'ya en kısa yol bulunduysa
                    if (dist[w] == dist[v] + 1)
                    {
                        sigma[w] += sigma[v];
                        pred[w].Add(v);
                    }
                }
            }

            // Betweenness hesaplaması (kontrol et)
            var delta = new Dictionary<int, double>();
            foreach (var v in nodes)
            {
                delta[v] = 0.0;
            }

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
        int n = nodes.Count;
        if (n > 2)
        {
            foreach (var v in nodes)
            {
                betweenness[v] /= ((n - 1) * (n - 2)) / 2.0;
            }
        }

        return betweenness;
    }
}

/* Önemli Düğümlerin Belirlenmesi için Köprü görevi gören kullanıcıları bulmak gerekiyordu.
Algoritma: Standart Betweenness Centrality algoritması ( tanım : diğer düğümler arasındaki en kısa yollar üzerinde ne sıklıkla yer aldığını ölçer )
Sonuçların Saklanması: CSV formatında kaydetme özelliği ekledim (kontrol edilecek)
 */
