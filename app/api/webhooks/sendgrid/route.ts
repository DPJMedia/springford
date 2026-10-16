import { createAdminClient } from "@/lib/supabase/admin";
import { verifySendGridRequest } from "@/lib/webhooks/verifySendGrid";
import { NextResponse } from "next/server";
export const runtime="nodejs";
export const maxDuration=60;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request:Request){
 const config={publicKey:process.env.SENDGRID_WEBHOOK_PUBLIC_KEY,token:process.env.SENDGRID_WEBHOOK_TOKEN};
 if(!config.publicKey&&!config.token)return NextResponse.json({error:"Webhook is not configured"},{status:503});
 const raw=await request.text();if(raw.length>4_000_000)return new NextResponse(null,{status:413});
 if(!verifySendGridRequest(request.headers,raw,new URL(request.url),config))return NextResponse.json({error:"Unauthorized"},{status:401});
 let events:unknown;try{events=JSON.parse(raw);}catch{return NextResponse.json({error:"Invalid JSON"},{status:400});}
 if(!Array.isArray(events)||events.length>10000)return NextResponse.json({error:"Invalid event batch"},{status:400});
 const db=createAdminClient();let inserted=0,skipped=0;const tenantCache=new Map<string,string>();
 try{
  for(const event of events){
   if(!event||typeof event!=="object"){skipped++;continue;}
   const campaignId=event.campaign_id??event.custom_args?.campaign_id;
   if(typeof campaignId!=="string"||!UUID.test(campaignId)||typeof event.email!=="string"||typeof event.event!=="string"){skipped++;continue;}
   let tenantId=tenantCache.get(campaignId);
   if(!tenantId){const {data,error}=await db.from("newsletter_campaigns").select("tenant_id").eq("id",campaignId).maybeSingle();if(error)throw error;if(!data?.tenant_id){skipped++;continue;}tenantId=data.tenant_id;tenantCache.set(campaignId,tenantId!);}
   const seconds=typeof event.timestamp==="number"?event.timestamp:Date.now()/1000;
   if(!Number.isFinite(seconds)||seconds<0||seconds>253402300799){skipped++;continue;}
   const occurredAt=new Date(seconds*1000).toISOString();
   if(["unsubscribe","group_unsubscribe","spamreport"].includes(event.event)){
    const {data:profiles,error}=await db.from("user_profiles").select("id").eq("email",event.email.trim().toLowerCase());if(error)throw error;
    for(const profile of profiles??[]){const {error}=await db.rpc("apply_newsletter_suppression",{p_user:profile.id,p_tenant:event.event==="group_unsubscribe"?tenantId:null,p_occurred:occurredAt});if(error)throw error;}
   }
   const {error}=await db.from("newsletter_email_events").insert({campaign_id:campaignId,tenant_id:tenantId,email:event.email,event:event.event,url:typeof event.url==="string"?event.url:null,reason:typeof event.reason==="string"?event.reason:typeof event.status==="string"?event.status:null,sg_event_id:typeof event.sg_event_id==="string"?event.sg_event_id:null,occurred_at:occurredAt,raw:event});
   if(error){if(error.code==="23505"){skipped++;continue;}throw error;}inserted++;
  }
 }catch(error){console.error("Email webhook persistence failed",error instanceof Error?error.message:"Database error");return NextResponse.json({error:"Please retry delivery"},{status:503});}
 return NextResponse.json({ok:true,processed:events.length,inserted,skipped});
}
