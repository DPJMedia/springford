import type { Metadata } from "next";
import SectionClient from "./SectionClient";
import { createClient } from "@/lib/supabase/server";
import { loadTenantForPage } from "@/lib/tenant/loadTenantForPage";
import { getSiteConfig } from "@/lib/seo/site";
import { parseStoredSectionConfig } from "@/lib/tenant/sectionConfigStorage";
import { ARTICLE_LIST_COLUMNS } from "@/lib/supabase/articleQueries";
import type { Article } from "@/lib/types/database";
type Props={params:Promise<{section:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{const {section}=await params;const tenant=await loadTenantForPage();const {siteName,siteUrl}=getSiteConfig(tenant);const label=parseStoredSectionConfig(tenant.section_config).sections.find(s=>s.slug===section)?.label||section.replaceAll("-"," ");return {title:`${label} | ${siteName}`,description:`Latest ${label} reporting from ${siteName}.`,alternates:{canonical:`${siteUrl}/section/${section}`}};}
export default async function SectionPage({params}:Props){const {section}=await params;const tenant=await loadTenantForPage();const db=await createClient();const {data,error}=await db.from("article_previews").select(ARTICLE_LIST_COLUMNS).eq("tenant_id",tenant.id).contains("sections",[section]).order("published_at",{ascending:false});return <SectionClient section={section} initialArticles={error?null:(data??[]) as unknown as Article[]}/>;}
