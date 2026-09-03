import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const ACTION_LABELS = [
  'Users.createUser','Users.deactivateUser','Consumers.createConsumer',
  'Products.createProduct','Products.updateProductPrice',
  'Stock.addStock','Stock.reserveStock','Stock.releaseStock','Stock.commitStock',
  'Payment.createPayment','Payment.authorizePayment','Payment.capturePayment','Payment.cancelPayment','Payment.refundPayment',
  'Delivery.createDelivery','Delivery.updateDeliveryStatus'
] as const;

const COMMON_EVIDENCE_INPUTS=['examples/ecommerce/src/domain.ts','config/validation.yml','package.json','scripts/characterize.ts','scripts/evidence-key-lib.ts','.github/workflows/facop-qualification.yml'];
function filesUnder(path:string):string[]{if(!existsSync(path)) return []; const stat=statSync(path); if(!stat.isDirectory()) return [path]; return readdirSync(path).flatMap(name=>filesUnder(join(path,name)));}
export function actionPath(label:string){const [entity,action]=label.split('.'); if(!entity||!action) throw new Error(`invalid action label: ${label}`); return `examples/ecommerce/actions/${entity}/${action}`;}
export function actionEvidenceKey(label:string){const hash=createHash('sha256'); const files=[...filesUnder(actionPath(label)),...COMMON_EVIDENCE_INPUTS.filter(existsSync)].sort(); for(const file of files){hash.update(file);hash.update('\0');hash.update(readFileSync(file));hash.update('\0');} hash.update(`node=${process.version};platform=${process.platform};arch=${process.arch}`); return `sha256:${hash.digest('hex')}`;}
