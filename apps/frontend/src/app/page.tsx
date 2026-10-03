import { EventHeatmap } from "@/features/event-heatmap/components/event-heatmap/event-heatmap";

export default function Home() {
  return (
    <main className="h-dvh w-full">
      <h1 className="sr-only">Mapa cieplna zdarzeń w Krakowie</h1>
      <EventHeatmap />
    </main>
  );
}
