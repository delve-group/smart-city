import { EventMapView } from "@/features/event-map/components/event-map-view/event-map-view";

export default function Home() {
  return (
    <main className="h-dvh w-full">
      <h1 className="sr-only">Events in Kraków</h1>
      <EventMapView />
    </main>
  );
}
