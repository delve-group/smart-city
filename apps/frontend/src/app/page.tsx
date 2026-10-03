import { CityMapView } from "@/features/city-map/components/city-map-view/city-map-view";

export default function Home() {
  return (
    <main className="h-dvh w-full">
      <h1 className="sr-only">Kraków city reports</h1>
      <CityMapView />
    </main>
  );
}
