import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Seeding deletes every user, course, order and enrolment first. Refuse to
  // run against a database that already has users (production, above all)
  // unless a local reset is explicitly requested.
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0 && process.env.SEED_FORCE !== 'yes') {
    console.error(
      `Refusing to seed: the database already has ${existingUsers} user(s), and seeding deletes all data.\n` +
        'For a local reset only: SEED_FORCE=yes npm run seed',
    );
    process.exit(1);
  }

  await prisma.testimonial.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.course.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();
  await prisma.brandSettings.deleteMany();
  await prisma.aISettings.deleteMany();

  const adminPassword = await bcrypt.hash('admin123', 12);
  const instructorPassword = await bcrypt.hash('instructor123', 12);
  const customerPassword = await bcrypt.hash('customer123', 12);

  const admin = await prisma.user.create({
    data: {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@futureline.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  const instructor = await prisma.user.create({
    data: {
      firstName: 'Sarah',
      lastName: 'Mitchell',
      email: 'instructor@futureline.com',
      password: instructorPassword,
      role: 'INSTRUCTOR',
    },
  });

  const customer = await prisma.user.create({
    data: {
      firstName: 'John',
      lastName: 'Customer',
      email: 'customer@futureline.com',
      password: customerPassword,
      role: 'CUSTOMER',
    },
  });

  const courses = await Promise.all([
    prisma.course.create({
      data: {
        title: 'AI Fundamentals & Machine Learning',
        slug: 'ai-fundamentals-machine-learning',
        shortDescription: 'Master the foundations of AI and machine learning with hands-on projects.',
        fullDescription: 'This comprehensive course covers the core concepts of artificial intelligence and machine learning. You will learn about neural networks, deep learning, natural language processing, and computer vision. Through hands-on projects, you will build real AI applications using Python and popular ML frameworks.',
        deliveryType: 'ONLINE',
        category: 'AI & Machine Learning',
        level: 'Beginner',
        price: 299,
        discountPrice: 249,
        durationHours: 40,
        instructorId: instructor.id,
        thumbnail: '/images/ai-course.jpg',
        status: 'PUBLISHED',
      },
    }),
    prisma.course.create({
      data: {
        title: 'Full-Stack Web Development Bootcamp',
        slug: 'fullstack-web-development-bootcamp',
        shortDescription: 'Become a full-stack developer with React, Node.js, and modern web technologies.',
        fullDescription: 'An intensive bootcamp covering front-end and back-end web development. Learn React, Next.js, Node.js, databases, API design, authentication, and deployment. Build portfolio-ready projects and gain industry-relevant skills.',
        deliveryType: 'IN_PERSON',
        category: 'Web Development',
        level: 'Intermediate',
        price: 799,
        durationHours: 80,
        startDate: new Date('2026-04-01'),
        endDate: new Date('2026-06-30'),
        seatCapacity: 25,
        location: 'FutureLine Campus, London',
        instructorId: instructor.id,
        thumbnail: '/images/web-dev.jpg',
        status: 'PUBLISHED',
      },
    }),
    prisma.course.create({
      data: {
        title: 'Cybersecurity Essentials',
        slug: 'cybersecurity-essentials',
        shortDescription: 'Learn to protect systems and data from cyber threats with industry best practices.',
        fullDescription: 'Understand the fundamentals of cybersecurity including threat analysis, network security, encryption, incident response, and compliance frameworks. This course prepares you for real-world security challenges and certification exams.',
        deliveryType: 'ONLINE',
        category: 'Cybersecurity',
        level: 'Beginner',
        price: 349,
        discountPrice: 299,
        durationHours: 35,
        instructorId: instructor.id,
        thumbnail: '/images/cybersecurity.jpg',
        status: 'PUBLISHED',
      },
    }),
    prisma.course.create({
      data: {
        title: 'Cloud Architecture & DevOps',
        slug: 'cloud-architecture-devops',
        shortDescription: 'Design scalable cloud solutions and implement DevOps pipelines.',
        fullDescription: 'Master cloud architecture patterns using AWS, Azure, and GCP. Learn infrastructure as code, CI/CD pipelines, containerization with Docker and Kubernetes, monitoring, and cloud-native application design.',
        deliveryType: 'HYBRID',
        category: 'Cloud Computing',
        level: 'Advanced',
        price: 599,
        durationHours: 60,
        startDate: new Date('2026-05-15'),
        endDate: new Date('2026-08-15'),
        seatCapacity: 20,
        location: 'FutureLine Campus, London + Online',
        instructorId: instructor.id,
        thumbnail: '/images/cloud.jpg',
        status: 'PUBLISHED',
      },
    }),
    prisma.course.create({
      data: {
        title: 'Data Analytics with Python',
        slug: 'data-analytics-python',
        shortDescription: 'Transform raw data into actionable insights using Python and analytics tools.',
        fullDescription: 'Learn data analysis, visualization, and statistical methods using Python, Pandas, NumPy, and Matplotlib. Work with real datasets to develop dashboards, reports, and predictive models that drive business decisions.',
        deliveryType: 'ONLINE',
        category: 'Data Science',
        level: 'Intermediate',
        price: 399,
        discountPrice: 349,
        durationHours: 45,
        instructorId: instructor.id,
        thumbnail: '/images/data-analytics.jpg',
        status: 'PUBLISHED',
      },
    }),
  ]);

  await Promise.all([
    prisma.lesson.createMany({
      data: [
        { courseId: courses[0].id, moduleTitle: 'Introduction to AI', lessonTitle: 'What is Artificial Intelligence?', content: 'An overview of AI, its history, and current applications in industry.', orderIndex: 1 },
        { courseId: courses[0].id, moduleTitle: 'Introduction to AI', lessonTitle: 'Types of Machine Learning', content: 'Understanding supervised, unsupervised, and reinforcement learning paradigms.', orderIndex: 2 },
        { courseId: courses[0].id, moduleTitle: 'Neural Networks', lessonTitle: 'Building Your First Neural Network', content: 'Hands-on guide to creating a neural network from scratch using Python.', orderIndex: 3 },
        { courseId: courses[0].id, moduleTitle: 'Neural Networks', lessonTitle: 'Deep Learning Frameworks', content: 'Introduction to TensorFlow and PyTorch for building deep learning models.', orderIndex: 4 },
        { courseId: courses[2].id, moduleTitle: 'Security Foundations', lessonTitle: 'Introduction to Cybersecurity', content: 'Overview of the cybersecurity landscape and common threat vectors.', orderIndex: 1 },
        { courseId: courses[2].id, moduleTitle: 'Security Foundations', lessonTitle: 'Network Security Basics', content: 'Understanding firewalls, VPNs, and network monitoring tools.', orderIndex: 2 },
        { courseId: courses[4].id, moduleTitle: 'Python for Data', lessonTitle: 'Getting Started with Pandas', content: 'Introduction to the Pandas library for data manipulation and analysis.', orderIndex: 1 },
        { courseId: courses[4].id, moduleTitle: 'Python for Data', lessonTitle: 'Data Visualization with Matplotlib', content: 'Creating charts, graphs, and interactive visualizations.', orderIndex: 2 },
      ],
    }),
  ]);

  await prisma.service.createMany({
    data: [
      {
        title: 'Custom AI Solutions',
        description: 'We design and build bespoke AI solutions tailored to your business needs. From natural language processing to computer vision, our team delivers intelligent systems that automate processes, enhance decision-making, and drive innovation.',
        category: 'AI & Automation',
        pricingModel: 'Custom Quote',
        featured: true,
        status: 'ACTIVE',
      },
      {
        title: 'Digital Transformation Consulting',
        description: 'Our expert consultants help organisations navigate their digital transformation journey. We assess your current infrastructure, identify opportunities for improvement, and develop a roadmap for sustainable digital growth.',
        category: 'Consulting',
        pricingModel: 'Per Project',
        featured: true,
        status: 'ACTIVE',
      },
      {
        title: 'Corporate Training Programmes',
        description: 'Upskill your workforce with customised training programmes. We deliver in-house training sessions on AI, cloud computing, cybersecurity, and software development, tailored to your team\'s skill level and business objectives.',
        category: 'Training',
        pricingModel: 'Per Session',
        featured: true,
        status: 'ACTIVE',
      },
    ],
  });

  await prisma.testimonial.createMany({
    data: [
      {
        name: 'James Thompson',
        role: 'Software Engineer at TechCorp',
        content: 'The AI Fundamentals course at FutureLine completely transformed my career. The hands-on projects gave me practical skills I use every day.',
        rating: 5,
        featured: true,
      },
      {
        name: 'Emily Chen',
        role: 'Data Analyst at FinanceHub',
        content: 'FutureLine\'s training programme was exactly what our team needed. The instructors are knowledgeable, and the curriculum is industry-relevant.',
        rating: 5,
        featured: true,
      },
      {
        name: 'Michael Roberts',
        role: 'CTO at StartupLab',
        content: 'We partnered with FutureLine for our AI consulting needs. Their team delivered an outstanding solution that improved our efficiency by 40%.',
        rating: 5,
        featured: true,
      },
    ],
  });

  await prisma.brandSettings.create({
    data: {
      companyName: 'FutureLine',
      tagline: 'Design • Deploy • Evolve',
      primaryColor: '#0F1E3D',
      accentColor: '#18A999',
    },
  });

  await prisma.aISettings.create({
    data: {
      enabled: true,
      welcomeMessage: 'Let our AI help you find the perfect course for your goals.',
    },
  });

  console.log('Seed data created successfully!');
  console.log('Admin: admin@futureline.com / admin123');
  console.log('Instructor: instructor@futureline.com / instructor123');
  console.log('Customer: customer@futureline.com / customer123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
