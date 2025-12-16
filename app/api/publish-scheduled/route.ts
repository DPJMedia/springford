import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  try {
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get current time
    const now = new Date().toISOString();

    // Find articles that should be published
    const { data: scheduledArticles, error: fetchError } = await supabase
      .from("articles")
      .select("id, title, scheduled_for")
      .eq("status", "scheduled")
      .lte("scheduled_for", now);

    if (fetchError) {
      console.error("Error fetching scheduled articles:", fetchError);
      return NextResponse.json(
        { success: false, error: fetchError.message },
        { status: 500 }
      );
    }

    if (!scheduledArticles || scheduledArticles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No articles due for publishing",
        published_count: 0,
        timestamp: now,
      });
    }

    // Publish each article
    const publishResults = [];
    for (const article of scheduledArticles) {
      const { error: updateError } = await supabase
        .from("articles")
        .update({
          status: "published",
          published_at: article.scheduled_for,
          updated_at: now,
        })
        .eq("id", article.id);

      if (updateError) {
        console.error(`Error publishing article ${article.id}:`, updateError);
        publishResults.push({
          id: article.id,
          title: article.title,
          success: false,
          error: updateError.message,
        });
      } else {
        publishResults.push({
          id: article.id,
          title: article.title,
          success: true,
        });
      }
    }

    const successCount = publishResults.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      message: `Published ${successCount} article(s)`,
      published_count: successCount,
      results: publishResults,
      timestamp: now,
    });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

