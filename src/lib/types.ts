export interface Period {
  id: number;
  slug: string;
  name: string;
  startYear: number;
  endYear: number;
  blurb: string;
  color: string;
  sort: number;
}

export interface Artist {
  id: number;
  slug: string;
  periodSlug: string;
  name: string;
  born: number | null;
  died: number | null;
  nationality: string;
  movement: string;
  bio: string;
  significance: string;
  portraitUrl: string | null;
  wikiUrl: string;
  paintingCount: number;
}

export interface Painting {
  id: number;
  title: string;
  yearText: string;
  yearNum: number | null;
  imageUrl: string;
  thumbUrl: string;
  story: string;
  facts: string[];
  wikiUrl: string;
}

export interface TimelinePayload {
  periods: Period[];
  artists: Artist[];
}
