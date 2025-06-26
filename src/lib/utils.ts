import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
<<<<<<< HEAD

=======
>>>>>>> f081092 (done all except ui and users page)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
