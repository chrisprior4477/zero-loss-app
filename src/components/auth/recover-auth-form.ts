import { unstable_rethrow } from "next/navigation";

/** Keep a lost action response on the form while letting Next handle redirects. */
export function recoverAuthForm<State>(
  submit: (previous: State, data: FormData) => Promise<State>,
  interrupted: (data: FormData) => State,
) {
  return async (previous: State, data: FormData): Promise<State> => {
    try {
      return await submit(previous, data);
    } catch (error) {
      unstable_rethrow(error);
      return interrupted(data);
    }
  };
}

export function formText(data: FormData, field: string): string {
  const value = data.get(field);
  return typeof value === "string" ? value.trim() : "";
}
