export type PublicAuthorProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  newsletter_subscribed?: boolean;
};

/** Private profile fields never cross the public endpoint. */
export async function findPublicAuthor(input: {
  name?: string;
  username?: string;
}): Promise<PublicAuthorProfile | null> {
  const params = new URLSearchParams();
  if (input.name) params.set("name", input.name);
  if (input.username) params.set("username", input.username);
  const response = await fetch(`/api/public-author?${params}`);
  if (!response.ok) return null;
  return (await response.json()).author ?? null;
}
