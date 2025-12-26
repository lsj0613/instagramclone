import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import User from '@/lib/models/User.model';
import Post from '@/lib/models/Post.model';
import Notification from '@/lib/models/Notification.model';
import connectDB from '@/lib/db';
import bcrypt from 'bcrypt';

async function seedDatabase() {
    try {
      await connectDB();
  
      // 초기화
      await User.deleteMany({});
      await Post.deleteMany({});
      await Notification.deleteMany({});
  
      // 1. 공통 비밀번호 생성 (실제 로그인 테스트를 위해 필요)
      const hashedPassword = await bcrypt.hash('password123', 10);
  
      // 2. 유저 생성
      const users = [];
      for (let i = 0; i < 10; i++) {
        const user = await User.create({
          username: faker.internet.username().slice(0, 20), // 3자 이상 보장
          email: faker.internet.email(),
          password: hashedPassword, // 스키마의 required 조건 충족
          profileImage: faker.image.avatar(),
          bio: faker.lorem.sentence().slice(0, 150), // maxlength 준수
          settings: {
            isPrivate: false,
            receiveNotifications: true,
            theme: 'system' // enum 값 준수
          }
        });
        users.push(user);
      }
  
      // 3. 게시물 생성
      const posts = [];
      for (const user of users) {
        for (let j = 0; j < 2; j++) {
          const post = await Post.create({
            author: user._id,
            images: [faker.image.url({ width: 600, height: 600 })], // validate 조건 충족
            caption: faker.lorem.paragraph().slice(0, 2200), // maxlength 준수
            likes: [users[Math.floor(Math.random() * users.length)]._id] // 무작위 좋아요 1개
          });
          posts.push(post);
        }
      }
  
      // 4. 알림 생성
      for (let k = 0; k < 15; k++) {
        const issuer = users[Math.floor(Math.random() * users.length)];
        const receiver = users[Math.floor(Math.random() * users.length)];
  
        if (issuer._id.equals(receiver._id)) continue;
  
        const type = faker.helpers.arrayElement(['LIKE', 'COMMENT', 'FOLLOW']);
        
        await Notification.create({
          issuer: issuer._id,
          receiver: receiver._id,
          type: type,
          // LIKE나 COMMENT일 때만 postId 연결 (논리적 정합성)
          postId: type !== 'FOLLOW' ? faker.helpers.arrayElement(posts)._id : undefined,
          isRead: false
        });
      }
  
      console.log('✅ 스키마 정합성 검증 완료 및 데이터 생성 성공');
      process.exit(0);
    } catch (error) {
      console.error('❌ 데이터 생성 실패:', error);
      process.exit(1);
    }
  }
  
  seedDatabase();