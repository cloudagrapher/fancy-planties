'use client';

interface CareStatisticsProps {
  statistics: {
    totalActivePlants: number;
    overdueCount: number;
    dueTodayCount: number;
    dueSoonCount: number;
    careStreakDays: number;
    totalCareEventsThisWeek: number;
    averageCareConsistency: number;
  };
}

export default function CareStatistics({ statistics }: CareStatisticsProps) {
  const getStreakMessage = (days: number) => {
    if (days === 0) return 'Start your streak!';
    if (days === 1) return '1 day streak';
    return `${days} day streak`;
  };

  const getConsistencyColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getConsistencyLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Plants */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Active Plants</p>
            <p className="text-2xl font-bold text-gray-900">{statistics.totalActivePlants}</p>
          </div>
          <div className="text-2xl">🌱</div>
        </div>
      </div>

      {/* Care Streak */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Care Streak</p>
            <p className="text-2xl font-bold text-gray-900">{statistics.careStreakDays}</p>
            <p className="text-xs text-gray-500">{getStreakMessage(statistics.careStreakDays)}</p>
          </div>
          <div className="text-2xl">🔥</div>
        </div>
      </div>

      {/* This Week's Care */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">This Week</p>
            <p className="text-2xl font-bold text-gray-900">{statistics.totalCareEventsThisWeek}</p>
            <p className="text-xs text-gray-500">care events</p>
          </div>
          <div className="text-2xl">📅</div>
        </div>
      </div>

      {/* Care Consistency */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Consistency</p>
            <p className="text-2xl font-bold text-gray-900">{statistics.averageCareConsistency}%</p>
            <p className={`text-xs px-2 py-1 rounded-full ${getConsistencyColor(statistics.averageCareConsistency)}`}>
              {getConsistencyLabel(statistics.averageCareConsistency)}
            </p>
          </div>
          <div className="text-2xl">📊</div>
        </div>
      </div>

      {/* Care Alerts Summary - spans full width on mobile */}
      <div className="col-span-2 lg:col-span-4 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg border border-primary-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Care Alerts Summary</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className={`text-2xl font-bold ${statistics.overdueCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
              {statistics.overdueCount}
            </div>
            <div className="text-xs text-gray-600">Overdue</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${statistics.dueTodayCount > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
              {statistics.dueTodayCount}
            </div>
            <div className="text-xs text-gray-600">Due Today</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${statistics.dueSoonCount > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
              {statistics.dueSoonCount}
            </div>
            <div className="text-xs text-gray-600">Due Soon</div>
          </div>
        </div>
        
        {(statistics.overdueCount + statistics.dueTodayCount + statistics.dueSoonCount) === 0 && (
          <div className="text-center mt-2">
            <p className="text-sm text-green-600 font-medium">🎉 All plants are well cared for!</p>
          </div>
        )}
      </div>
    </div>
  );
}