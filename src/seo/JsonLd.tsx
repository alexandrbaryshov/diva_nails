import { SITE_URL, STUDIO } from "../data/studio";
import { jsonLdScript, nailSalonJsonLd } from "./schema";

const TEXT = jsonLdScript(nailSalonJsonLd(STUDIO, SITE_URL));

/** Разметка NailSalon для поисковиков; попадает в пререндеренный HTML главной. */
export function JsonLd() {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: TEXT }} />;
}
