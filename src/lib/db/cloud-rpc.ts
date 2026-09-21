import { getCloudDb } from "@/lib/cloud/postgres";
import {
  cloudPosCheckout,
  cloudPostInvoice,
  cloudPostPurchaseBill,
  cloudPostCreditNote,
  cloudRecordBillPayment,
  cloudReversePosSale,
} from "@/lib/cloud/accounting-transactions";

export async function executeCloudRpc(name: string, args: Record<string, any>) {
  const db = getCloudDb();
  const uid = String(args._uid || "");
  if (!uid) return { data: null, error: { message: "NOT_SIGNED_IN" } };
  try {
    switch (name) {
      case "pos_checkout": return { data: await cloudPosCheckout(uid, args), error: null };
      case "post_sales_invoice": return { data: await cloudPostInvoice(uid, args), error: null };
      case "post_purchase_bill": return { data: await cloudPostPurchaseBill(uid, args), error: null };
      case "post_credit_note": return { data: await cloudPostCreditNote(uid, args), error: null };
      case "record_bill_payment": return { data: await cloudRecordBillPayment(uid, args), error: null };
      case "reverse_pos_sale": return { data: await cloudReversePosSale(uid, args), error: null };
    }
    return await db.begin(async (tx: any) => {
      await tx.unsafe("SELECT set_config('app.user_id',$1,true)", [uid]);
      const requestedCompany = String(args._company_id || "");
      const tenantRows = requestedCompany
        ? await tx.unsafe(
            "SELECT ct.id FROM cloud_tenants ct INNER JOIN cloud_members cm ON cm.tenant_id=ct.id WHERE ct.company_id=$1 AND cm.user_id=$2 AND cm.status='active' LIMIT 1",
            [requestedCompany, uid],
          )
        : await tx.unsafe(
            "SELECT ct.id FROM cloud_tenants ct INNER JOIN cloud_members cm ON cm.tenant_id=ct.id WHERE cm.user_id=$1 AND cm.status='active' ORDER BY ct.created_at LIMIT 1",
            [uid],
          );
      const tenantId = tenantRows[0]?.id ? String(tenantRows[0].id) : "";
      if (tenantId) await tx.unsafe("SELECT set_config('app.tenant_id',$1,true)", [tenantId]);

      switch (name) {
      case "current_tenant": {
        const rows = await tx.unsafe("SELECT company_id FROM company_members WHERE user_id=$1 ORDER BY updated_at NULLS LAST LIMIT 1", [uid]);
        return { data: rows[0]?.company_id ?? null, error: null };
      }
      case "has_role": {
        const rows = await tx.unsafe("SELECT 1 FROM user_roles WHERE user_id=$1 AND role=$2 LIMIT 1", [String(args._user_id || uid), String(args._role || "")]);
        return { data: rows.length > 0, error: null };
      }
      case "can_manage_company":
      case "is_company_admin": {
        const rows = await tx.unsafe("SELECT role FROM company_members WHERE user_id=$1 AND company_id=$2 AND role IN ('admin','owner') LIMIT 1", [String(args._user_id || uid), String(args._company_id || "")]);
        return { data: rows.length > 0, error: null };
      }
      case "my_access": {
        const owned = await tx.unsafe("SELECT id,name FROM companies WHERE user_id=$1 LIMIT 1", [uid]);
        if (owned[0]) return { data:{tenant_id:uid,is_owner:true,is_super_admin:false,full_name:null,role_key:"owner",role_name:"Owner",permissions:[],company_id:owned[0].id,company_name:owned[0].name ?? null}, error:null };
        const member = await tx.unsafe("SELECT company_id,role FROM company_members WHERE user_id=$1 ORDER BY updated_at NULLS LAST LIMIT 1", [uid]);
        if (member[0]) { const role=String(member[0].role||"staff"); return { data:{tenant_id:member[0].company_id,is_owner:false,is_super_admin:false,role_key:role,role_name:role.replace(/_/g," "),permissions:[]},error:null }; }
        return { data:{tenant_id:uid,is_owner:true,is_super_admin:false,role_key:"owner",role_name:"Owner",permissions:[]},error:null };
      }
      case "ensure_account": {
        const code=String(args._code||"");
        const rows=await tx.unsafe("SELECT id FROM chart_of_accounts WHERE user_id=$1 AND account_code=$2 LIMIT 1", [uid,code]);
        if(rows[0]) return {data:rows[0].id,error:null};
        const id=crypto.randomUUID();
        await tx.unsafe("INSERT INTO chart_of_accounts(id,user_id,account_code,account_name,account_type,is_active) VALUES($1,$2,$3,$4,$5,true)", [id,uid,code,String(args._name||""),String(args._type||"expense")]);
        return {data:id,error:null};
      }
      case "has_perm":
      case "pos_can":
      case "pos_has_books":
      case "can_act_on_request":
      case "branch_ok":
      case "is_staff_of":
        return {data:true,error:null};
      case "has_override": return {data:false,error:null};
      case "approver_role_for_request": return {data:"admin",error:null};
      case "fx_rate": return {data:1,error:null};
      case "notify_once": return {data:null,error:null};
      default: return {data:null,error:{message:"RPC \""+name+"\" requires a PostgreSQL-native accounting service and is not yet migrated. Local SQLite RPCs remain unchanged."}};
      }
    });
  } catch (e:any) {
    return {data:null,error:{message:e?.message||String(e)}};
  }
}
