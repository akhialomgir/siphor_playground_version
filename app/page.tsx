import ScoringDisplay from '@/components/ScoringDisplay';
import DragDropBox from '@/components/DragDropBox';
import { DroppedItemsProvider } from '@/components/DroppedItemsContext';

export default function Home() {
  return (
    <DroppedItemsProvider>
      <div className="grid grid-rows-[1fr_auto] gap-4 w-screen h-screen bg-[#0b1220] text-slate-100">
        <div className="grid grid-cols-2 gap-4 p-4">
          <DragDropBox />
          <ScoringDisplay />
        </div>

        <div className="border border-slate-700 h-16 bg-[#0f1625]"></div>
      </div>
    </DroppedItemsProvider>
  );
}
