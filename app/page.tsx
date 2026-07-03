import BasketballGame from "@/components/basketball-game";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
            <span className="gradient-text">Court Kings</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline">🏀 Basketball Game</span>
          </div>
        </div>
      </header>

      <main className="container flex flex-1 flex-col items-center py-8 sm:py-12">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="gradient-text">Court Kings</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dribble, shoot, and score — beat the clock!
          </p>
        </div>

        <BasketballGame />
      </main>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        <p>Arrow keys / WASD to move &middot; Space to shoot &middot; Score from deep for 3 points</p>
      </footer>
    </div>
  );
}
