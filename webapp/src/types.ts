// Типы ответов REST API.

export interface LeaderboardItem {
  rank: number;
  userId: string;
  username: string | null;
  firstName: string;
  lastName: string | null;
  avatar: string | null;
  karma: number;
  messageCount: number;
}

export interface LeaderboardResponse {
  chatId: string;
  sort: 'karma' | 'messages';
  total: number;
  items: LeaderboardItem[];
}

export interface SocialLink {
  label: string;
  url: string;
}

export interface ProfileUser {
  id: string;
  username: string | null;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
  bio: string | null;
  socialLinks: SocialLink[] | null;
  customTheme: string | null;
}

export interface ProfileStats {
  chatId: string;
  firstSeenAt: string;
  messageCount: number;
  karma: number;
  rank: number | null;
}

export interface ProfileResponse {
  user: ProfileUser;
  stats: ProfileStats | null;
  isSelf: boolean;
}

export interface VoteResponse {
  ok: boolean;
  chatId: string;
  targetId: string;
  voteType: number;
  karma: number;
}
