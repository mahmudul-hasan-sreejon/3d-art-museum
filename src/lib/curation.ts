/**
 * Curation list: ONLY names and dates of periods + which Wikipedia articles
 * to pull. Every bio, image, story and fact is fetched verbatim from
 * Wikipedia / Wikimedia at seed time — nothing here is generated content.
 *
 * `wiki` = exact English Wikipedia page title.
 */
export interface CuratedArtist {
  wiki: string;
}

export interface CuratedPeriod {
  slug: string;
  name: string;
  wiki: string; // Wikipedia article for the movement (blurb source)
  start: number;
  end: number;
  color: string;
  artists: CuratedArtist[];
}

export const CURATION: CuratedPeriod[] = [
  {
    slug: "medieval-gothic",
    name: "Medieval & Gothic",
    wiki: "Gothic art",
    start: 1100,
    end: 1420,
    color: "#7b5e3b",
    artists: [
      { wiki: "Cimabue" },
      { wiki: "Duccio" },
      { wiki: "Giotto" },
      { wiki: "Simone Martini" },
    ],
  },
  {
    slug: "renaissance",
    name: "Renaissance",
    wiki: "Renaissance art",
    start: 1400,
    end: 1600,
    color: "#a8842c",
    artists: [
      { wiki: "Sandro Botticelli" },
      { wiki: "Leonardo da Vinci" },
      { wiki: "Michelangelo" },
      { wiki: "Raphael" },
      { wiki: "Titian" },
    ],
  },
  {
    slug: "baroque",
    name: "Baroque",
    wiki: "Baroque painting",
    start: 1590,
    end: 1725,
    color: "#8c3b22",
    artists: [
      { wiki: "Caravaggio" },
      { wiki: "Peter Paul Rubens" },
      { wiki: "Artemisia Gentileschi" },
      { wiki: "Rembrandt" },
      { wiki: "Diego Velázquez" },
      { wiki: "Johannes Vermeer" },
    ],
  },
  {
    slug: "rococo",
    name: "Rococo",
    wiki: "Rococo",
    start: 1715,
    end: 1780,
    color: "#c98da3",
    artists: [
      { wiki: "Antoine Watteau" },
      { wiki: "François Boucher" },
      { wiki: "Jean-Honoré Fragonard" },
      { wiki: "Élisabeth Vigée Le Brun" },
    ],
  },
  {
    slug: "neoclassicism",
    name: "Neoclassicism",
    wiki: "Neoclassicism",
    start: 1760,
    end: 1830,
    color: "#7d8a97",
    artists: [
      { wiki: "Benjamin West" },
      { wiki: "Angelica Kauffman" },
      { wiki: "Jacques-Louis David" },
      { wiki: "Jean-Auguste-Dominique Ingres" },
    ],
  },
  {
    slug: "romanticism",
    name: "Romanticism",
    wiki: "Romanticism",
    start: 1780,
    end: 1850,
    color: "#5b3a6e",
    artists: [
      { wiki: "Francisco Goya" },
      { wiki: "Caspar David Friedrich" },
      { wiki: "J. M. W. Turner" },
      { wiki: "Théodore Géricault" },
      { wiki: "Eugène Delacroix" },
    ],
  },
  {
    slug: "realism",
    name: "Realism",
    wiki: "Realism (art movement)",
    start: 1840,
    end: 1880,
    color: "#4f6b4a",
    artists: [
      { wiki: "Jean-François Millet" },
      { wiki: "Gustave Courbet" },
      { wiki: "Rosa Bonheur" },
      { wiki: "Ilya Repin" },
    ],
  },
  {
    slug: "impressionism",
    name: "Impressionism",
    wiki: "Impressionism",
    start: 1865,
    end: 1895,
    color: "#5e8fb5",
    artists: [
      { wiki: "Édouard Manet" },
      { wiki: "Edgar Degas" },
      { wiki: "Claude Monet" },
      { wiki: "Pierre-Auguste Renoir" },
      { wiki: "Berthe Morisot" },
      { wiki: "Mary Cassatt" },
    ],
  },
  {
    slug: "post-impressionism",
    name: "Post-Impressionism",
    wiki: "Post-Impressionism",
    start: 1885,
    end: 1910,
    color: "#c97c2c",
    artists: [
      { wiki: "Paul Cézanne" },
      { wiki: "Paul Gauguin" },
      { wiki: "Vincent van Gogh" },
      { wiki: "Georges Seurat" },
      { wiki: "Henri de Toulouse-Lautrec" },
    ],
  },
  {
    slug: "expressionism",
    name: "Expressionism",
    wiki: "Expressionism",
    start: 1905,
    end: 1933,
    color: "#b03a3a",
    artists: [
      { wiki: "Edvard Munch" },
      { wiki: "Ernst Ludwig Kirchner" },
      { wiki: "Franz Marc" },
      { wiki: "Egon Schiele" },
      { wiki: "Amedeo Modigliani" },
    ],
  },
  {
    slug: "cubism",
    name: "Cubism",
    wiki: "Cubism",
    start: 1907,
    end: 1925,
    color: "#6f6a55",
    artists: [
      { wiki: "Pablo Picasso" },
      { wiki: "Georges Braque" },
      { wiki: "Juan Gris" },
      { wiki: "Jean Metzinger" },
      { wiki: "Robert Delaunay" },
    ],
  },
  {
    slug: "surrealism",
    name: "Surrealism",
    wiki: "Surrealism",
    start: 1924,
    end: 1966,
    color: "#3f7d72",
    artists: [
      { wiki: "Max Ernst" },
      { wiki: "Joan Miró" },
      { wiki: "René Magritte" },
      { wiki: "Salvador Dalí" },
      { wiki: "Frida Kahlo" },
    ],
  },
  {
    slug: "abstract-expressionism",
    name: "Abstract Expressionism",
    wiki: "Abstract expressionism",
    start: 1943,
    end: 1965,
    color: "#2f2f38",
    artists: [
      { wiki: "Mark Rothko" },
      { wiki: "Jackson Pollock" },
      { wiki: "Lee Krasner" },
      { wiki: "Willem de Kooning" },
    ],
  },
  {
    slug: "pop-art",
    name: "Pop Art",
    wiki: "Pop art",
    start: 1955,
    end: 1975,
    color: "#d23b6e",
    artists: [
      { wiki: "Andy Warhol" },
      { wiki: "Roy Lichtenstein" },
      { wiki: "David Hockney" },
      { wiki: "Keith Haring" },
    ],
  },
  {
    slug: "contemporary",
    name: "Contemporary",
    wiki: "Contemporary art",
    start: 1975,
    end: 2026,
    color: "#9a9aa5",
    artists: [
      { wiki: "Gerhard Richter" },
      { wiki: "Jean-Michel Basquiat" },
      { wiki: "Yayoi Kusama" },
      { wiki: "Banksy" },
    ],
  },
];
