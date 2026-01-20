import ScoringDisplay from '@/components/ScoringDisplay';
import DragDropBox from '@/components/DragDropBox';
import { DroppedItemsProvider } from '@/components/DroppedItemsContext';
import HistoryHeatmap from '@/components/HistoryHeatmap';
import { DateProvider } from '@/components/DateContext';

export default function Home() {
  return (
    <DateProvider>
      <DroppedItemsProvider>
        <div className="grid grid-rows-[1fr_auto] gap-4 w-screen h-screen bg-[#0b1220] text-slate-100">
          <div className="grid grid-cols-2 gap-4 p-4">
            <DragDropBox />
            <ScoringDisplay />
          </div>

          <div className="mx-4 mb-6 border border-slate-700 bg-[#0f1625] p-4 rounded-xl shadow-md">
            <HistoryHeatmap />
          </div>
        </div>
      </DroppedItemsProvider>
    </DateProvider>
  );
}
