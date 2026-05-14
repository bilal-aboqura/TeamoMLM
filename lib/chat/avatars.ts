export const PREDEFINED_AVATARS = [
  { id: "avatar_01", label: "فارس", src: "/avatars/avatar_01.png" },
  { id: "avatar_02", label: "نجمة", src: "/avatars/avatar_02.png" },
  { id: "avatar_03", label: "قمر", src: "/avatars/avatar_03.png" },
  { id: "avatar_04", label: "برق", src: "/avatars/avatar_04.png" },
  { id: "avatar_05", label: "زمرد", src: "/avatars/avatar_05.png" },
  { id: "avatar_06", label: "لؤلؤ", src: "/avatars/avatar_06.png" },
  { id: "avatar_07", label: "نخلة", src: "/avatars/avatar_07.png" },
  { id: "avatar_08", label: "موج", src: "/avatars/avatar_08.png" },
  { id: "avatar_09", label: "شمس", src: "/avatars/avatar_09.png" },
  { id: "avatar_10", label: "ورد", src: "/avatars/avatar_10.png" },
  { id: "avatar_11", label: "صقر", src: "/avatars/avatar_11.png" },
  { id: "avatar_12", label: "ياقوت", src: "/avatars/avatar_12.png" },
] as const;

export type AvatarId = (typeof PREDEFINED_AVATARS)[number]["id"];

export const AVATAR_IDS = PREDEFINED_AVATARS.map((avatar) => avatar.id) as [
  AvatarId,
  ...AvatarId[],
];
