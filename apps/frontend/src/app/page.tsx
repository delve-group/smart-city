import { EventHeatmap } from "@/features/event-heatmap/components/event-heatmap/event-heatmap";

export default function Home() {
  return (
    <main className="h-dvh w-full">
      <h1 className="sr-only">Heatmap of events in Kraków</h1>
      <EventHeatmap />
    </main>
  );
}
