import { PreferenceRepository } from "./preference.repository";
import { PreferenceService } from "./preference.service";

const preferenceRepository = new PreferenceRepository();
export const preferenceService=new PreferenceService(preferenceRepository)