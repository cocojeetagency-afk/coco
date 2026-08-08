"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addUser,
  changePassword,
  deleteUser,
  resetUserPassword,
  type SettingsState,
} from "@/lib/actions";
import type { User } from "@/lib/db";

const label = "mb-1 block text-sm font-semibold text-slate-700";
const input =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100";
const btn =
  "w-full rounded-xl bg-green-700 py-3 text-sm font-bold text-white disabled:opacity-60";

function Message({ state }: { state: SettingsState }) {
  if (!state?.error && !state?.success) return null;
  return (
    <p
      className={`mt-2 rounded-lg px-3 py-2 text-sm font-medium ${
        state.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
      }`}
    >
      {state.error ?? `✓ ${state.success}`}
    </p>
  );
}

export default function UserManager({
  users,
  currentUser,
}: {
  users: User[];
  currentUser: string;
}) {
  const [pwState, pwAction, pwPending] = useActionState(changePassword, undefined);
  const [addState, addAction, addPending] = useActionState(addUser, undefined);
  const [resetState, resetAction, resetPending] = useActionState(
    resetUserPassword,
    undefined
  );
  const [showAdd, setShowAdd] = useState(false);
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [removing, startRemove] = useTransition();

  return (
    <div className="space-y-5">
      {/* Change my password */}
      <div>
        <h3 className="mb-2 text-sm font-bold text-slate-800">
          🔑 Change my password
        </h3>
        <form action={pwAction} className="space-y-3">
          <div>
            <label htmlFor="current_password" className={label}>
              Current password
            </label>
            <input
              id="current_password"
              name="current_password"
              type="password"
              required
              autoComplete="current-password"
              className={input}
            />
          </div>
          <div>
            <label htmlFor="new_password" className={label}>
              New password
            </label>
            <input
              id="new_password"
              name="new_password"
              type="password"
              required
              minLength={4}
              autoComplete="new-password"
              className={input}
            />
          </div>
          <div>
            <label htmlFor="confirm_password" className={label}>
              Confirm new password
            </label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              required
              minLength={4}
              autoComplete="new-password"
              className={input}
            />
          </div>
          <button type="submit" disabled={pwPending} className={btn}>
            {pwPending ? "Saving..." : "Update password"}
          </button>
          <Message state={pwState} />
        </form>
      </div>

      {/* User list */}
      <div className="border-t border-slate-100 pt-4">
        <h3 className="mb-2 text-sm font-bold text-slate-800">
          👥 Users ({users.length})
        </h3>
        <ul className="space-y-2">
          {users.map((u) => {
            const isMe = u.username.toLowerCase() === currentUser.toLowerCase();
            return (
              <li
                key={u.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800">
                    {u.username}
                    {isMe && (
                      <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                        you
                      </span>
                    )}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setResetFor(resetFor === u.username ? null : u.username)
                      }
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600"
                    >
                      Set password
                    </button>
                    {!isMe && users.length > 1 && (
                      <button
                        type="button"
                        disabled={removing}
                        onClick={() => {
                          if (confirm(`Remove user "${u.username}"?`))
                            startRemove(() => deleteUser(u.username));
                        }}
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {resetFor === u.username && (
                  <form action={resetAction} className="mt-3 flex gap-2">
                    <input type="hidden" name="username" value={u.username} />
                    <input
                      name="password"
                      type="text"
                      required
                      minLength={4}
                      placeholder="New password"
                      className={`${input} flex-1`}
                    />
                    <button
                      type="submit"
                      disabled={resetPending}
                      className="rounded-xl bg-green-700 px-4 text-sm font-bold text-white disabled:opacity-60"
                    >
                      Save
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
        <Message state={resetState} />

        {showAdd ? (
          <form
            action={addAction}
            className="mt-3 space-y-3 rounded-xl border border-green-200 bg-green-50/50 p-3"
          >
            <div>
              <label htmlFor="new_username" className={label}>
                New username
              </label>
              <input
                id="new_username"
                name="username"
                required
                minLength={3}
                autoComplete="off"
                className={input}
              />
            </div>
            <div>
              <label htmlFor="new_user_password" className={label}>
                Password
              </label>
              <input
                id="new_user_password"
                name="password"
                type="text"
                required
                minLength={4}
                autoComplete="off"
                className={input}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={addPending} className={btn}>
                {addPending ? "Adding..." : "Add user"}
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="w-32 rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>
            </div>
            <Message state={addState} />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="mt-3 w-full rounded-xl border border-green-700 py-3 text-sm font-bold text-green-700"
          >
            ➕ Add new user
          </button>
        )}
      </div>
    </div>
  );
}
