export type User = {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  private: boolean;
  verified: boolean;
  verifiedOnly: boolean;
  intention: "friends" | "dating" | "both";
  demo: boolean;
  sample: boolean;
};
export type Dare = {
  id: string;
  title: string;
  category: string;
  description: string;
  duration: string;
  icon: string;
  color: string;
  rules: string[];
};
export type Post = {
  id: string;
  user_id: string;
  caption: string;
  image: string | null;
  created: string;
  user: User;
  likes: number;
  liked: boolean;
  comments: number;
};
export type Match = {
  id: string;
  user_id: string;
  peer_id: string;
  dare: string;
  day: string;
  status: "pending" | "active" | "completed" | "left";
  peer: User;
  incoming: boolean;
  dareInfo: Dare;
};
export type AppState = {
  user: User;
  posts: Post[];
  people: User[];
  matches: Match[];
  requests: User[];
  follows: { following: string; status: string }[];
  dares: Dare[];
  day: string;
  resetAt: string;
  blocks: string[];
};
export type Message = {
  id: string;
  user_id: string;
  text: string;
  created: string;
};
export type Comment = { id: string; text: string; user: User; created: string };
export type Page =
  | "Explore"
  | "My dares"
  | "Messages"
  | "Community"
  | "My profile"
  | "Settings"
  | "Safety center";
