import { createFileRoute, Link } from "@tanstack/react-router";
import { PHONE_PHOTO_CREDITS } from "@/lib/photo-credits";

export const Route = createFileRoute("/photo-credits")({
  head: () => ({
    meta: [
      { title: "Photo credits — Newton's Hub" },
      {
        name: "description",
        content: "Credits and licences for the phone reference photos used on Newton's Hub.",
      },
    ],
  }),
  component: PhotoCredits,
});

function PhotoCredits() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">Photo credits</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Accessory photos on Newton&apos;s Hub are of our own stock. Phone listings use reference
        photos of each model from{" "}
        <a
          href="https://commons.wikimedia.org"
          className="text-primary hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          Wikimedia Commons
        </a>
        , shared by the photographers below under the licence shown. They show the model, not the
        exact unit you&apos;ll receive; colours and condition follow the listing. Images were
        cropped and resized for the site.
      </p>
      <ul className="mt-8 divide-y divide-border rounded-2xl border border-border">
        {PHONE_PHOTO_CREDITS.map((c) => (
          <li
            key={c.slug}
            className="flex flex-col gap-1 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <Link
              to="/shop/$slug"
              params={{ slug: c.slug }}
              className="font-semibold hover:text-primary"
            >
              {c.model}
            </Link>
            <span className="text-muted-foreground">
              <a href={c.source} target="_blank" rel="noreferrer" className="hover:text-foreground">
                Photo by {c.author}
              </a>{" "}
              ·{" "}
              <a
                href={c.licenseUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground"
              >
                {c.license}
              </a>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs text-muted-foreground">
        Apple, iPhone, Samsung and Galaxy are trademarks of their respective owners. Newton&apos;s
        Hub is an independent reseller and is not affiliated with them.
      </p>
    </div>
  );
}
