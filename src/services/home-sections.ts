import { DEFAULT_HOME_SECTIONS, type HomeSection } from "../domain/home-section.js";
import { repositories } from "../repositories/index.js";

let seeding: Promise<HomeSection[]> | null = null;

/** All sections; creates the default layout the first time (once, even with concurrent calls). */
export async function getHomeSections(): Promise<HomeSection[]> {
  const sections = await repositories.homeSections.listAll();
  if (sections.length > 0) return sections;

  seeding ??= repositories.homeSections
    .count()
    .then((n) => (n === 0 ? repositories.homeSections.createMany(DEFAULT_HOME_SECTIONS) : repositories.homeSections.listAll()))
    .finally(() => {
      seeding = null;
    });
  return seeding;
}
