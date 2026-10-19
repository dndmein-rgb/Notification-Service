import { AdminRepository } from "./admin.repository";
import { AdminService } from "./admin.service";

const adminRepository = new AdminRepository();
export const adminService=new AdminService(adminRepository)