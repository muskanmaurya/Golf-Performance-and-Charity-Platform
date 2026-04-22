"use server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import WinnerNotification from "@/components/emails/WinnerNotification";
import {
  isMissingColumnError,
  isPostgrestError,
} from "@/lib/validators/postgrest";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWinnerNotificationEmail(
  userId: string,
  tier: number,
  prize: string,
  drawDate: string,
  winningNumbers: number[]
) {
  const supabase = getSupabaseAdminClient();
  try {
    // 1. Fetch user email from auth.users
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(
      userId
    );

    if (userError) {
      console.error(`Error fetching user ${userId}:`, userError);
      return { error: `Failed to fetch user details for ${userId}.` };
    }

    if (!user?.user?.email) {
      console.error(`No email found for user ${userId}.`);
      return { error: `No email found for user ${userId}.` };
    }

    // 2. Fetch user's full name from profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    if (profileError) {
      if (isPostgrestError(profileError) && isMissingColumnError(profileError)) {
        console.warn(
          `Skipping profile fetch for ${userId} due to schema drift:`,
          profileError.message
        );
      } else {
        console.error(
          `Error fetching profile for user ${userId}:`,
          profileError
        );
      }
      // Continue with a fallback name
    }

    const winnerName = profile?.full_name || "Valued Player";
    const userEmail = user.user.email;

    // 3. Send the email
    const { data, error } = await resend.emails.send({
      from: "Digital Heroes <muskanmaurya2712@gmail.com>",
      to: [userEmail],
      subject: "Congratulations! You're a Winner!",
      react: WinnerNotification({
        winnerName,
        tier,
        prize,
        drawDate,
        winningNumbers,
      }),
    });

    if (error) {
      console.error(`Failed to send email to ${userEmail}:`, error);
      return { error: `Failed to send email to ${userEmail}.` };
    }

    console.log(`Successfully sent winner notification to ${userEmail}.`);
    return { data };
  } catch (e) {
    console.error("An unexpected error occurred in sendWinnerNotificationEmail:", e);
    return { error: "An unexpected error occurred." };
  }
}
