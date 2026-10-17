import { asyncHandler } from "@notification/shared-utils";
import type{Request,Response} from 'express'
import { CreateNotificationInput, GetUserNotificationsQuery } from "./notification.schema";
import { notificationService } from "./notification.container";

export const createNotification=asyncHandler(async(req:Request,res:Response)=>{
  const body=req.body as CreateNotificationInput;
  const result=await notificationService.create(body)
  res.status(201).json({
    success:true,
    message:"Notification created successfully",
    data:result
  })
})

export const userNotifications=asyncHandler(async(req:Request,res:Response)=>{
  const {limit,page,userId,unreadOnly,tenantId}=res.locals.validatedQuery as  GetUserNotificationsQuery
  const result=await notificationService.getUserNotifications({limit,page,userId,tenantId,unreadOnly})
  
  res.status(200).json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  });

export const findById=asyncHandler(async(req:Request,res:Response)=>{
  const id=req.params.id 
  const result=await notificationService.findNotificationById(id)
  res.status(200).json({
    success:true,
    message:"Notification fetched successfully",
    data:result
  })
})

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await notificationService.markAsRead(id);
  res.status(200).json({
    success: true,
    message: "Notification read succesfully",
    data:result
  })
})

