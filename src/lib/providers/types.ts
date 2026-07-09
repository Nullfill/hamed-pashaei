import { z } from "zod";

export const mediaTypeSchema = z.enum(["movie", "series"]);

export type MediaType = z.infer<typeof mediaTypeSchema>;

export interface MediaPath {
  provider?: string;
  id: string;
  type: MediaType;
  sourcePath?: string;
}

export interface PlaybackInput extends MediaPath {
  dubbed?: string;
  season?: string;
  episode?: string;
}

export interface TaxonomyTerm {
  id?: string;
  name: string;
}

export interface PersonCredit {
  id?: string;
  name: string;
  image?: string;
}

export interface EpisodeLink {
  quality?: string;
  src: string;
  subtitleFa?: string;
  subtitleEn?: string;
  dubbed?: boolean;
}

export interface SeriesEpisode {
  season: number;
  episode: number;
  title: string;
  links: EpisodeLink[];
}

export interface BrowseInput {
  type: MediaType;
  page?: number;
  genres?: string;
  country?: string;
  dubbed?: boolean;
  subtitle?: boolean;
}

export interface BrowseResult {
  items: MediaItem[];
  page: number;
  totalPages: number;
  perPage: number;
}

export interface SearchResult {
  provider: string;
  id: string;
  type: MediaType;
  titleFa?: string;
  titleEn?: string;
  poster?: string;
  imdb?: string;
  badges: string[];
  sourcePath: string;
}

export interface HomeSection {
  id: string;
  title: string;
  type: "slider" | "rail";
  items: MediaItem[];
  href?: string;
  provider?: string;
  sourceId?: string;
  sourceType?: string;
}

export interface MediaItem {
  provider: string;
  id: string;
  type: MediaType;
  title: string;
  titleFa?: string;
  titleEn?: string;
  poster?: string;
  backdrop?: string;
  rating?: string;
  badges: string[];
  sourcePath: string;
}

export interface MediaDetails {
  provider: string;
  id: string;
  type: MediaType;
  title: string;
  titleFa?: string;
  titleEn?: string;
  poster?: string;
  backdrop?: string;
  description?: string;
  rating?: string;
  metacritic?: string;
  year?: string;
  runtime?: string;
  age?: string;
  imdbId?: string;
  awards?: string;
  updateText?: string;
  genres?: string[];
  genreTerms?: TaxonomyTerm[];
  countries?: TaxonomyTerm[];
  languages?: TaxonomyTerm[];
  actors?: PersonCredit[];
  directors?: PersonCredit[];
  episodes?: SeriesEpisode[];
  related?: MediaItem[];
  badges: string[];
  sourcePath: string;
  playUrl?: string;
  bodyHtml?: string;
}

export interface ProviderCategory {
  provider: string;
  key: string;
  label: string;
  movieId?: string;
  seriesId?: string;
  sources?: Record<string, { movieId?: string; seriesId?: string }>;
}

export interface ProviderCountry {
  provider: string;
  key: string;
  label: string;
  value: string;
  englishLabel?: string;
  sources?: Record<string, { value?: string; englishLabel?: string }>;
}

export interface PlaybackSource {
  quality?: string;
  src: string;
  type?: string;
  subtitleFa?: string;
  subtitleEn?: string;
  dubbed?: boolean;
}

export interface PlaybackData {
  poster?: string;
  sources: PlaybackSource[];
}

export interface MediaProvider {
  id: string;
  name: string;

  search(query: string): Promise<SearchResult[]>;
  getHomeSections(): Promise<HomeSection[]>;
  browse(input: BrowseInput): Promise<BrowseResult>;
  getDetails(input: MediaPath): Promise<MediaDetails>;
  getPlayback(input: PlaybackInput): Promise<PlaybackData>;
  getCategories?(): Promise<ProviderCategory[]>;
  getCountries?(): Promise<ProviderCountry[]>;
  getKidsSections?(): Promise<HomeSection[]>;
  getCatalogSections?(type: MediaType): Promise<HomeSection[]>;
  getSection?(input: { id: string; sourceType?: string; page?: number }): Promise<HomeSection>;
}

const assetUrlSchema = z.union([z.string().url(), z.string().startsWith("/api/provider-asset?")]);

export const searchResultSchema = z.object({
  provider: z.string(),
  id: z.string().min(1),
  type: mediaTypeSchema,
  titleFa: z.string().optional(),
  titleEn: z.string().optional(),
  poster: assetUrlSchema.optional(),
  imdb: z.string().optional(),
  badges: z.array(z.string()),
  sourcePath: z.string().min(1),
});

export const mediaItemSchema = z.object({
  provider: z.string(),
  id: z.string().min(1),
  type: mediaTypeSchema,
  title: z.string().min(1),
  titleFa: z.string().optional(),
  titleEn: z.string().optional(),
  poster: assetUrlSchema.optional(),
  backdrop: assetUrlSchema.optional(),
  rating: z.string().optional(),
  badges: z.array(z.string()),
  sourcePath: z.string().min(1),
});

export const homeSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(["slider", "rail"]),
  items: z.array(mediaItemSchema),
  href: z.string().optional(),
  provider: z.string().optional(),
  sourceId: z.string().optional(),
  sourceType: z.string().optional(),
});

export const mediaDetailsSchema = z.object({
  provider: z.string(),
  id: z.string().min(1),
  type: mediaTypeSchema,
  title: z.string().min(1),
  titleFa: z.string().optional(),
  titleEn: z.string().optional(),
  poster: assetUrlSchema.optional(),
  backdrop: assetUrlSchema.optional(),
  description: z.string().optional(),
  rating: z.string().optional(),
  metacritic: z.string().optional(),
  year: z.string().optional(),
  runtime: z.string().optional(),
  age: z.string().optional(),
  imdbId: z.string().optional(),
  awards: z.string().optional(),
  updateText: z.string().optional(),
  genres: z.array(z.string()).optional(),
  genreTerms: z.array(z.object({ id: z.string().optional(), name: z.string() })).optional(),
  countries: z.array(z.object({ id: z.string().optional(), name: z.string() })).optional(),
  languages: z.array(z.object({ id: z.string().optional(), name: z.string() })).optional(),
  actors: z.array(z.object({ id: z.string().optional(), name: z.string(), image: assetUrlSchema.optional() })).optional(),
  directors: z.array(z.object({ id: z.string().optional(), name: z.string(), image: assetUrlSchema.optional() })).optional(),
  episodes: z
    .array(
      z.object({
        season: z.number(),
        episode: z.number(),
        title: z.string(),
        links: z.array(
          z.object({
            quality: z.string().optional(),
            src: z.string().url(),
            subtitleFa: z.string().url().optional(),
            subtitleEn: z.string().url().optional(),
            dubbed: z.boolean().optional(),
          }),
        ),
      }),
    )
    .optional(),
  related: z.array(mediaItemSchema).optional(),
  badges: z.array(z.string()),
  sourcePath: z.string().min(1),
  playUrl: z.string().optional(),
  bodyHtml: z.string().optional(),
});

export const playbackDataSchema = z.object({
  poster: assetUrlSchema.optional(),
  sources: z.array(
    z.object({
      quality: z.string().optional(),
      src: z.string().url(),
      type: z.string().optional(),
      subtitleFa: z.string().url().optional(),
      subtitleEn: z.string().url().optional(),
      dubbed: z.boolean().optional(),
    }),
  ),
});
