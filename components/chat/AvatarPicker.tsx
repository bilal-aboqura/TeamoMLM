"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { PREDEFINED_AVATARS, type AvatarId } from "@/lib/chat/avatars";
import { updateAvatarSelection } from "@/app/dashboard/chat/_actions/updateAvatarSelection";

type Props = {
  currentAvatarId: AvatarId;
};

export function AvatarPicker({ currentAvatarId }: Props) {
  const [selected, setSelected] = useState<AvatarId>(currentAvatarId);
  const [pending, setPending] = useState<AvatarId | null>(null);

  async function chooseAvatar(avatarId: AvatarId) {
    setPending(avatarId);
    const result = await updateAvatarSelection({ avatarId });
    setPending(null);
    if (result.success) setSelected(avatarId);
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {PREDEFINED_AVATARS.map((avatar) => {
        const active = selected === avatar.id;
        return (
          <button
            key={avatar.id}
            type="button"
            onClick={() => chooseAvatar(avatar.id)}
            disabled={pending !== null}
            className={`relative rounded-lg border bg-white p-3 text-center transition ${
              active ? "border-emerald-400 ring-2 ring-emerald-100" : "border-slate-100 hover:border-slate-200"
            }`}
          >
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-50 to-sky-50 text-lg font-black text-emerald-700">
              {avatar.label.slice(0, 1)}
            </span>
            <span className="mt-2 block text-xs font-bold text-slate-600">{avatar.label}</span>
            {active && (
              <span className="absolute end-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                <Check className="h-3 w-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
