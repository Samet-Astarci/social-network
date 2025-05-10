import React, { useState } from 'react';
import AnalysisResults from '../components/AnalysisResults';

const [analysisResults, setAnalysisResults] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

const handleAnalysis = async (analysisType) => {
    setLoading(true);
    setError(null);
    try {
        const response = await fetch('/api/graph-analysis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                analysisType,
                userId: session?.user?.id,
                targetUserId: selectedUser?.id
            }),
        });

        if (!response.ok) {
            throw new Error('Analiz sırasında bir hata oluştu');
        }

        const data = await response.json();
        setAnalysisResults(data);
    } catch (err) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
};

{/* Analiz butonları */}
<div className="grid grid-cols-2 gap-4 mt-4">
    <button
        onClick={() => handleAnalysis('shortestPath')}
        disabled={loading || !selectedUser}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
    >
        En Kısa Yol Analizi
    </button>
    <button
        onClick={() => handleAnalysis('betweenness')}
        disabled={loading}
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
    >
        Betweenness Analizi
    </button>
    <button
        onClick={() => handleAnalysis('communities')}
        disabled={loading}
        className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
    >
        Topluluk Tespiti
    </button>
    <button
        onClick={() => handleAnalysis('networkDensity')}
        disabled={loading}
        className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:opacity-50"
    >
        Ağ Yoğunluğu
    </button>
    <button
        onClick={() => handleAnalysis('userActivity')}
        disabled={loading}
        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
    >
        Kullanıcı Aktivitesi
    </button>
    <button
        onClick={() => handleAnalysis('suggestions')}
        disabled={loading}
        className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 disabled:opacity-50"
    >
        Bağlantı Önerileri
    </button>
</div>

{/* Sonuçlar */}
{loading && (
    <div className="mt-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2">Analiz yapılıyor...</p>
    </div>
)}

{error && (
    <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
        {error}
    </div>
)}

{analysisResults && (
    <AnalysisResults results={analysisResults} type={currentAnalysisType} />
)} 