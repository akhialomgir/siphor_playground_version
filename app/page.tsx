import ScoringDisplay from '@/components/ScoringDisplay';
import DragDropBox from '@/components/DragDropBox';
import { DroppedItemsProvider } from '@/components/DroppedItemsContext';
import HistoryHeatmap from '@/components/HistoryHeatmap';
import { DateProvider } from '@/components/DateContext';
import ImportExport from '@/components/ImportExport';
import WeeklyBounty from '@/components/WeeklyBounty';

export default function Home() {
  return (
    <DateProvider>
      <DroppedItemsProvider>
        <div className="min-h-screen w-full box-border bg-[#0b1220] text-slate-100 pb-8">
          <div className="grid grid-cols-2 gap-4 p-4">
            <DragDropBox />
            <div className="flex flex-col gap-4">
              <ScoringDisplay />
              <WeeklyBounty />
            </div>
          </div>

          <div className="mx-4 mb-6 border border-slate-700 bg-[#0f1625] p-4 rounded-xl shadow-md">
            <HistoryHeatmap />
          </div>

          {/* Import/Export at bottom */}
          <div className="flex justify-end px-4 mt-8">
            <ImportExport />
          </div>
        </div>
      </DroppedItemsProvider>
    </DateProvider>
  );
}
