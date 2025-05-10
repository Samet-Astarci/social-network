import { PrismaClient } from '@prisma/client';
import {
    findShortestPath,
    calculateBetweennessCentrality,
    detectCommunities,
    analyzeNetworkDensity,
    analyzeUserActivity,
    suggestConnections,
    findCommonConnections
} from '../../utils/graphAlgorithms';

const prisma = new PrismaClient();

export default async function handler(req, res) {
    // CORS ayarları
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // OPTIONS isteğini yanıtla
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        let analysisType, userId, targetUserId;

        // GET veya POST metoduna göre parametreleri al
        if (req.method === 'GET') {
            const { from, to, type } = req.query;
            analysisType = type || 'shortestPath';
            userId = from;
            targetUserId = to;
        } else if (req.method === 'POST') {
            ({ analysisType, userId, targetUserId } = req.body);
        } else {
            return res.status(405).json({ message: 'Method not allowed' });
        }

        console.log('İstek parametreleri:', { analysisType, userId, targetUserId });

        switch (analysisType) {
            case 'shortestPath':
                if (!userId || !targetUserId) {
                    return res.status(400).json({ message: 'Kullanıcı ID\'leri gerekli' });
                }
                const path = await findShortestPath(userId, targetUserId);
                return res.status(200).json(path);

            case 'betweenness':
                const betweenness = await calculateBetweennessCentrality();
                return res.status(200).json(betweenness);

            case 'communities':
                const communities = await detectCommunities();
                return res.status(200).json(communities);

            case 'networkDensity':
                const density = await analyzeNetworkDensity();
                return res.status(200).json(density);

            case 'userActivity':
                const activity = await analyzeUserActivity();
                return res.status(200).json(activity);

            case 'suggestions':
                if (!userId) {
                    return res.status(400).json({ message: 'Kullanıcı ID\'si gerekli' });
                }
                const suggestions = await suggestConnections(userId);
                return res.status(200).json(suggestions);

            case 'commonConnections':
                if (!userId || !targetUserId) {
                    return res.status(400).json({ message: 'Kullanıcı ID\'leri gerekli' });
                }
                const common = await findCommonConnections(userId, targetUserId);
                return res.status(200).json(common);

            default:
                return res.status(400).json({ message: 'Geçersiz analiz tipi' });
        }
    } catch (error) {
        console.error('Graf analizi hatası:', error);
        return res.status(500).json({ 
            message: 'Sunucu hatası', 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
} 