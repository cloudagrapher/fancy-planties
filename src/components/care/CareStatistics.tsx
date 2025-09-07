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
      <div className="rounded-2xl shadow-sm border border-slate-200/70 bg-emerald-50/70 backdrop-blur p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">Active Plants</p>
            <p className="text-2xl font-bold text-emerald-600">{statistics.totalActivePlants}</p>
          </div>
          <div className="text-2xl">🌱</div>
        </div>
      </div>

      {/* Care Streak */}
      <div className="rounded-2xl shadow-sm border border-slate-200/70 bg-amber-50/70 backdrop-blur p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-amber-700">Care Streak</p>
            <p className="text-2xl font-bold text-amber-600">{statistics.careStreakDays}</p>
            <p className="text-xs text-amber-600">{getStreakMessage(statistics.careStreakDays)}</p>
          </div>
          <div className="text-2xl">🔥</div>
        </div>
      </div>

      {/* This Week's Care */}
      <div className="rounded-2xl shadow-sm border border-slate-200/70 bg-sky-50/70 backdrop-blur p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-sky-700">This Week</p>
            <p className="text-2xl font-bold text-sky-600">{statistics.totalCareEventsThisWeek}</p>
            <p className="text-xs text-sky-600">care events</p>
          </div>
          <div className="text-2xl">📅</div>
        </div>
      </div>

      {/* Care Consistency */}
      <div className="rounded-2xl shadow-sm border border-slate-200/70 bg-green-50/70 backdrop-blur p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-700">Consistency</p>
            <p className="text-2xl font-bold text-green-600">{statistics.averageCareConsistency}%</p>
            <p className={`text-xs px-2 py-1 rounded-full ${getConsistencyColor(statistics.averageCareConsistency)}`}>
              {getConsistencyLabel(statistics.averageCareConsistency)}
            </p>
          </div>
          <div className="text-2xl">📊</div>
        </div>
      </div>

      {/* Care Alerts Summary - spans full width on mobile */}
      <div className="col-span-2 lg:col-span-4 rounded-2xl shadow-sm border border-slate-200/70 bg-gradient-to-r from-primary-50/70 to-secondary-50/70 backdrop-blur p-6">
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