import { Download, RotateCcw } from 'lucide-react';
import { SettingsForm } from '../components/SettingsForm';
import { StorageService } from '../storage';
import { Dashboard } from '../popup/Dashboard';

function downloadCsv(filename: string, content: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export const OptionsApp = () => {
    const exportCsv = async () => {
        const csv = await StorageService.exportUsageCsv();
        downloadCsv(`focusoverlay-usage-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    };

    const resetToday = async () => {
        if (
            !confirm(
                "Reset today's usage stats? This cannot be undone. Limits and locks are not affected."
            )
        ) {
            return;
        }
        await StorageService.resetTodayUsage();
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            <header className="bg-white border-b border-gray-200 px-6 py-5">
                <h1 className="text-2xl font-bold">FocusOverlay</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Track and limit time on YouTube, Instagram, and X.
                </p>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8 space-y-10">
                <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-lg font-bold mb-4">Today&apos;s usage</h2>
                    <Dashboard />
                </section>

                <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <SettingsForm />
                </section>

                <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
                    <h2 className="text-lg font-bold">Data</h2>
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={exportCsv}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-medium"
                        >
                            <Download size={16} />
                            Export usage (CSV)
                        </button>
                        <button
                            type="button"
                            onClick={resetToday}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
                        >
                            <RotateCcw size={16} />
                            Reset today&apos;s stats
                        </button>
                    </div>
                </section>
            </main>
        </div>
    );
};
