import Image from "next/image"

interface PawiTipProps {
  tip: string
  trivia?: string
  image?: string
}

export function PawiTip({ tip, trivia, image = "/pawi-turtle.png" }: PawiTipProps) {
  return (
    <div className="mx-5 mb-5 mt-2 flex items-start gap-4 rounded-3xl bg-primary/10 p-5 shadow-sm">
      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-4 ring-primary/20 shadow-md">
        <Image
          src={image}
          alt="Pawi Mascot"
          width={48}
          height={48}
          className="h-12 w-12 object-contain"
        />
      </div>
      <div className="relative mt-1 flex-1 rounded-2xl rounded-tl-none bg-white p-4 text-sm font-medium text-foreground shadow-sm">
        <div
          className="absolute -left-2 top-0 h-4 w-4 bg-white"
          style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
        />
        <div className="relative z-10 space-y-2">
          <p className="leading-relaxed text-foreground/80">
            <strong className="text-primary mr-1">Pawi says:</strong>
            {tip}
          </p>
          {trivia && (
            <div className="rounded-xl bg-secondary/30 p-2.5 text-xs text-muted-foreground border border-border/40">
              <span className="font-bold text-foreground">💡 Did you know?</span> {trivia}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
