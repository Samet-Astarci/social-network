import React from 'react';

const AnalysisResults = ({ results, type }) => {
    if (!results) return null;

    const renderShortestPath = () => (
        <div className="space-y-2">
            <h4 className="font-semibold">En Kısa Yol:</h4>
            <div className="flex items-center space-x-2">
                {results.path.map((user, index) => (
                    <React.Fragment key={user.id}>
                        <span className="px-3 py-1 bg-blue-100 rounded-full">
                            {user.username}
                        </span>
                        {index < results.path.length - 1 && (
                            <span className="text-gray-500">→</span>
                        )}
                    </React.Fragment>
                ))}
            </div>
            <p className="text-sm text-gray-600">
                Toplam Mesafe: {results.distance}
            </p>
        </div>
    );

    const renderBetweenness = () => (
        <div className="space-y-2">
            <h4 className="font-semibold">Betweenness Merkeziyeti:</h4>
            <div className="space-y-1">
                {results.slice(0, 10).map((result, index) => (
                    <div key={result.user.id} className="flex justify-between items-center">
                        <span className="font-medium">{result.user.username}</span>
                        <span className="text-sm text-gray-600">
                            {result.score.toFixed(4)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderCommunities = () => (
        <div className="space-y-4">
            <h4 className="font-semibold">Topluluklar:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.communities.map((community) => (
                    <div key={community.communityId} className="p-4 bg-gray-50 rounded-lg">
                        <h5 className="font-medium mb-2">Topluluk {community.communityId}</h5>
                        <div className="space-y-1">
                            {community.members.map((member) => (
                                <div key={member.id} className="text-sm">
                                    {member.username}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <p className="text-sm text-gray-600">
                Toplam Modularite: {results.modularity.toFixed(4)}
            </p>
        </div>
    );

    const renderNetworkDensity = () => (
        <div className="space-y-4">
            <div>
                <h4 className="font-semibold">Genel Ağ Yoğunluğu:</h4>
                <p className="text-lg font-medium">
                    {(results.overallDensity * 100).toFixed(2)}%
                </p>
            </div>
            <div>
                <h4 className="font-semibold">Zaman Bazlı Yoğunluk:</h4>
                <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="p-3 bg-gray-50 rounded">
                        <p className="text-sm text-gray-600">Son Hafta</p>
                        <p className="text-lg font-medium">
                            {(results.timeBasedDensity.lastWeek * 100).toFixed(2)}%
                        </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                        <p className="text-sm text-gray-600">Son Ay</p>
                        <p className="text-lg font-medium">
                            {(results.timeBasedDensity.lastMonth * 100).toFixed(2)}%
                        </p>
                    </div>
                </div>
            </div>
            <div>
                <h4 className="font-semibold">Topluluk Yoğunlukları:</h4>
                <div className="space-y-2 mt-2">
                    {results.communityDensities.map((community) => (
                        <div key={community.communityId} className="p-3 bg-gray-50 rounded">
                            <div className="flex justify-between items-center">
                                <span className="font-medium">
                                    Topluluk {community.communityId}
                                </span>
                                <span className="text-sm text-gray-600">
                                    {(community.density * 100).toFixed(2)}%
                                </span>
                            </div>
                            <p className="text-sm text-gray-600">
                                {community.memberCount} üye
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderUserActivity = () => (
        <div className="space-y-4">
            <div>
                <h4 className="font-semibold">En Aktif Kullanıcılar:</h4>
                <div className="space-y-2 mt-2">
                    {results.topUsers.slice(0, 10).map((user) => (
                        <div key={user.user.id} className="p-3 bg-gray-50 rounded">
                            <div className="flex justify-between items-center">
                                <span className="font-medium">{user.user.username}</span>
                                <span className="text-sm text-gray-600">
                                    {user.activityScore.toFixed(2)}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-1 text-sm text-gray-600">
                                <div>Toplam Bağlantı: {user.metrics.totalConnections}</div>
                                <div>Son Ay: {user.metrics.recentConnections}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <h4 className="font-semibold">Kullanıcı Kategorileri:</h4>
                <div className="grid grid-cols-3 gap-4 mt-2">
                    <div className="p-3 bg-green-50 rounded">
                        <h5 className="font-medium text-green-700">Yüksek Aktif</h5>
                        <p className="text-sm text-green-600">
                            {results.categories.highlyActive.length} kullanıcı
                        </p>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded">
                        <h5 className="font-medium text-yellow-700">Orta Aktif</h5>
                        <p className="text-sm text-yellow-600">
                            {results.categories.moderatelyActive.length} kullanıcı
                        </p>
                    </div>
                    <div className="p-3 bg-red-50 rounded">
                        <h5 className="font-medium text-red-700">Düşük Aktif</h5>
                        <p className="text-sm text-red-600">
                            {results.categories.lessActive.length} kullanıcı
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderSuggestions = () => (
        <div className="space-y-2">
            <h4 className="font-semibold">Bağlantı Önerileri:</h4>
            <div className="space-y-2">
                {results.map((suggestion) => (
                    <div key={suggestion.user.id} className="p-3 bg-gray-50 rounded">
                        <div className="flex justify-between items-center">
                            <span className="font-medium">{suggestion.user.username}</span>
                            <span className="text-sm text-gray-600">
                                {suggestion.score.toFixed(2)} puan
                            </span>
                        </div>
                        <p className="text-sm text-gray-600">
                            {suggestion.commonConnections} ortak bağlantı
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderCommonConnections = () => (
        <div className="space-y-2">
            <h4 className="font-semibold">Ortak Bağlantılar:</h4>
            <p className="text-sm text-gray-600">
                Toplam {results.count} ortak bağlantı bulundu
            </p>
            <div className="space-y-2">
                {results.commonConnections.map((user) => (
                    <div key={user.id} className="p-3 bg-gray-50 rounded">
                        <span className="font-medium">{user.username}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderContent = () => {
        switch (type) {
            case 'shortestPath':
                return renderShortestPath();
            case 'betweenness':
                return renderBetweenness();
            case 'communities':
                return renderCommunities();
            case 'networkDensity':
                return renderNetworkDensity();
            case 'userActivity':
                return renderUserActivity();
            case 'suggestions':
                return renderSuggestions();
            case 'commonConnections':
                return renderCommonConnections();
            default:
                return (
                    <pre className="whitespace-pre-wrap">
                        {JSON.stringify(results, null, 2)}
                    </pre>
                );
        }
    };

    return (
        <div className="mt-4 p-4 bg-white rounded-lg shadow">
            {renderContent()}
        </div>
    );
};

export default AnalysisResults; 