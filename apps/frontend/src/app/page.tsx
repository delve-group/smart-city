import { Alert, AlertDescription, AlertTitle } from "@appica/ui-react/alert";
import { Badge } from "@appica/ui-react/badge";
import { Button } from "@appica/ui-react/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@appica/ui-react/card";
import { Field, FieldDescription, FieldLabel } from "@appica/ui-react/field";
import { Input } from "@appica/ui-react/input";
import { ThemeSwitcher } from "@/features/theme/theme-switcher";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-8 px-5 py-6 md:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <span aria-hidden className="h-6 w-1 rounded-full bg-brand-accent" />
          <span className="text-lg font-semibold text-foreground-intense">Smart City</span>
        </div>
        <ThemeSwitcher />
      </header>

      <main className="flex flex-col gap-6">
        <section className="flex flex-col gap-2">
          <Badge variant="soft" className="self-start">
            Szkielet aplikacji
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground-intense">
            Fundament interfejsu
          </h1>
          <p className="max-w-prose text-foreground-muted">
            Next.js z komponentami Appica UI i dwoma motywami: Civic oraz Signal. Funkcje
            produktu zostaną dodane po wyborze scenariusza demonstracyjnego.
          </p>
        </section>

        <Alert variant="info">
          <AlertTitle>Dane demonstracyjne</AlertTitle>
          <AlertDescription>
            Ten ekran pokazuje wyłącznie komponenty. Formularz niczego nie zapisuje.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Przykładowy formularz</CardTitle>
              <CardDescription>Etykieta, opis i pole tekstowe z Appica UI.</CardDescription>
            </CardHeader>
            <div className="px-6 pb-6">
              <Field>
                <FieldLabel>Adres</FieldLabel>
                <Input name="address" placeholder="np. Rynek Główny 1" />
                <FieldDescription>Ulica i numer budynku w Krakowie.</FieldDescription>
              </Field>
            </div>
            <CardFooter className="gap-3">
              <Button>Dalej</Button>
              <Button variant="outline">Anuluj</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statusy</CardTitle>
              <CardDescription>Kolor zawsze idzie w parze z tekstem.</CardDescription>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="info">Nowe</Badge>
                <Badge variant="warning">W toku</Badge>
                <Badge variant="success">Rozwiązane</Badge>
                <Badge variant="error">Odrzucone</Badge>
              </div>
            </CardHeader>
          </Card>
        </div>
      </main>
    </div>
  );
}
