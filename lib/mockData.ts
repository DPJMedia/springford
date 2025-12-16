export type ArticleStatus = "draft" | "published" | "scheduled";

export type Article = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  neighborhood: string;
  town: string;
  country: string;
  tags: string[];
  status: ArticleStatus;
  date: string;
  author: string;
  scheduledFor?: string;
};

export const mockArticles: Article[] = [
  {
    id: "1",
    title: "Riverfront Park Renovation Enters Final Phase",
    excerpt:
      "Crews start the final landscaping push with expanded walking loops, new lighting, and native plantings around the amphitheater.",
    category: "Government",
    neighborhood: "Riverfront",
    town: "Spring-Ford",
    country: "USA",
    tags: ["infrastructure", "community", "parks"],
    status: "published",
    date: "2024-11-29T10:00:00Z",
    author: "Alex Turner",
  },
  {
    id: "2",
    title: "New Café Collective Brings Shared Kitchen to Town Center",
    excerpt:
      "Four local bakers and roasters are teaming up to run a shared storefront with rotating menus and extended evening hours.",
    category: "Business",
    neighborhood: "Town Center",
    town: "Spring-Ford",
    country: "USA",
    tags: ["food", "small business"],
    status: "published",
    date: "2024-11-28T08:30:00Z",
    author: "Priya Desai",
  },
  {
    id: "3",
    title: "Community Solar Co-op Opens Second Enrollment Window",
    excerpt:
      "Homeowners and renters can join the solar co-op to lock in stable rates; info sessions scheduled over the next two weeks.",
    category: "Environment",
    neighborhood: "Maple Grove",
    town: "Spring-Ford",
    country: "USA",
    tags: ["energy", "sustainability"],
    status: "scheduled",
    date: "2024-11-30T09:15:00Z",
    scheduledFor: "2024-12-01T14:00:00Z",
    author: "Taylor Brooks",
  },
  {
    id: "4",
    title: "School Board Sets Vote on Arts Funding Pilot",
    excerpt:
      "The board will consider a one-year pilot to restore theater and music residencies at two elementary schools.",
    category: "Education",
    neighborhood: "Hillside",
    town: "Spring-Ford",
    country: "USA",
    tags: ["schools", "budget"],
    status: "draft",
    date: "2024-11-27T12:00:00Z",
    author: "Jordan Lee",
  },
  {
    id: "5",
    title: "Transit Link Adds Late-Night Service on Blue Line",
    excerpt:
      "Buses will run every 20 minutes until 1 a.m. on Fridays and Saturdays after strong rider feedback.",
    category: "Transit",
    neighborhood: "Depot District",
    town: "Spring-Ford",
    country: "USA",
    tags: ["transportation", "riders"],
    status: "published",
    date: "2024-11-26T18:20:00Z",
    author: "Casey Nguyen",
  },
  {
    id: "6",
    title: "Neighborhood Micro-Grant Recipients Announced",
    excerpt:
      "Eleven projects—from block cleanups to porch concerts—will receive up to $1,500 in the winter round.",
    category: "Community",
    neighborhood: "Elmwood",
    town: "Spring-Ford",
    country: "USA",
    tags: ["grants", "events"],
    status: "published",
    date: "2024-11-25T07:45:00Z",
    author: "Morgan Price",
  },
  {
    id: "7",
    title: "Council Schedules Listening Session on Zoning Rewrite",
    excerpt:
      "Planning staff will outline proposed form-based code updates with time for resident questions.",
    category: "Government",
    neighborhood: "Town Center",
    town: "Spring-Ford",
    country: "USA",
    tags: ["zoning", "planning"],
    status: "scheduled",
    date: "2024-11-30T16:00:00Z",
    scheduledFor: "2024-12-02T00:30:00Z",
    author: "Alex Turner",
  },
];


