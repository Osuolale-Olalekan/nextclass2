"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { TextField } from "@/components/FormField";

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace("/admin");
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "We couldn’t sign you in. Try again.");
    } catch {
      setError("We couldn’t reach the server. Check your internet connection and try again.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <TextField
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
        error={error}
      />
      <button type="submit" className="btn btn-brand w-full" disabled={busy || password === ""}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}


// "use client"

// import { loginAction } from "@/lib/user-action"
// import { useRouter } from "next/navigation"
// import { ChangeEvent, FormEvent, useState } from "react"

// const LoginForm = () => {
//   const router = useRouter()
//   const [userForm, setUserForm] = useState({
//     password: "",
//     email: "",
//   })

//   const registerUserHandler = async (e: FormEvent<HTMLFormElement>) => {
//     e.preventDefault()
//     const updateP = await loginAction(userForm)
//     if (updateP.success) {
//       router.push("/profile")
//     }
//   }

//   const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
//     const { name, value } = e.target
//     setUserForm((previous) => ({
//       ...previous,
//       [name]: value,
//     }))
//   }

//   return (
//     <div className="flex items-center justify-between h-screen p-5 md:p-10">
//       <form
//         onSubmit={registerUserHandler}
//         className="max-w-xl w-full m-auto shadow rounded p-4"
//       >
//         <h3 className="font-semibold">Register</h3>

//         <div className="flex flex-col mt-6 gap-4">
//           <div className="flex gap-4 items-center">
//             <input
//               value={userForm.email}
//               onChange={handleInputChange}
//               name="email"
//               required
//               placeholder="Email"
//               className="rounded border border-gray-300 outline-none px-2 text-sm h-10 focus:border-blue-800 flex-1"
//             />
//           </div>
//           <input
//             value={userForm.password}
//             onChange={handleInputChange}
//             type="password"
//             name="password"
//             placeholder="User Password"
//             className="rounded border border-gray-300 outline-none px-2 text-sm h-10 focus:border-blue-800"
//           />

//           <button className="h-12 rounded bg-blue-800 font-medium text-white">
//             Save
//           </button>
//         </div>
//       </form>
//     </div>
//   )
// }

// export default LoginForm
