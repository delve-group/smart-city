import { CityMapView } from "@/features/city-map/components/city-map-view/city-map-view";
import { ScreenTitle } from "@/shared/components/screen-title/screen-title";

export default function Home() {
  return (
    <main className="h-dvh w-full">
      <ScreenTitle title="meta.reports" heading="page.reports" />
      <CityMapView />
    </main>
  );
}
