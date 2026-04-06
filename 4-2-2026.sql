-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               10.4.32-MariaDB - mariadb.org binary distribution
-- Server OS:                    Win64
-- HeidiSQL Version:             12.14.0.7165
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for store_waves
CREATE DATABASE IF NOT EXISTS `store_waves` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;
USE `store_waves`;

-- Dumping structure for table store_waves.orders
CREATE TABLE IF NOT EXISTS `orders` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned DEFAULT NULL,
  `product_id` int(10) unsigned NOT NULL,
  `product_name` varchar(180) NOT NULL,
  `color` varchar(30) NOT NULL,
  `size` varchar(10) NOT NULL,
  `amount` int(11) NOT NULL,
  `unit_price_dt` decimal(10,2) NOT NULL,
  `delivery_fee_dt` decimal(10,2) NOT NULL DEFAULT 9.00,
  `total_price_dt` decimal(10,2) NOT NULL,
  `full_name` varchar(160) NOT NULL,
  `phone` varchar(30) NOT NULL,
  `address` text NOT NULL,
  `note` text DEFAULT NULL,
  `status` varchar(40) DEFAULT 'pending',
  `delivered_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_orders_user` (`user_id`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table store_waves.orders: ~2 rows (approximately)
REPLACE INTO `orders` (`id`, `user_id`, `product_id`, `product_name`, `color`, `size`, `amount`, `unit_price_dt`, `delivery_fee_dt`, `total_price_dt`, `full_name`, `phone`, `address`, `note`, `status`, `delivered_at`, `created_at`) VALUES
	(1, 1, 3, 'Ein El Hassoud Hoodie', 'White', 'M', 1, 69.00, 9.00, 78.00, 'mehdi makhlouf', '+21697843843', 'Nabeul, maamoura 8013', NULL, 'delivered', '2026-04-01 23:58:48', '2026-04-01 22:21:03'),
	(2, 1, 1, 'Lost In Your Gravity Hoodie', 'White', 'M', 1, 69.00, 9.00, 78.00, 'mehdi makhlouf', '+21697843843', 'maamoura', NULL, 'delivered', '2026-04-01 23:59:13', '2026-04-01 22:43:20');

-- Dumping structure for table store_waves.products
CREATE TABLE IF NOT EXISTS `products` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `price_cents` int(11) NOT NULL,
  `wave` varchar(40) NOT NULL DEFAULT '1stDrop',
  `colors_csv` varchar(120) NOT NULL DEFAULT 'W',
  `main_color` varchar(20) NOT NULL DEFAULT 'W',
  `sold_out` tinyint(1) NOT NULL DEFAULT 0,
  `image_url` longtext DEFAULT NULL,
  `color_images_map` longtext DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table store_waves.products: ~11 rows (approximately)
REPLACE INTO `products` (`id`, `name`, `price_cents`, `wave`, `colors_csv`, `main_color`, `sold_out`, `image_url`, `color_images_map`, `description`, `created_at`) VALUES
	(1, 'Lost In Your Gravity Hoodie', 6900, '1stDrop', 'W', 'W', 0, 'img/1/W/1st%20post.png', 'W=img/1/W/1st%20post.png', 'Midweight fleece with gradient print.', '2026-04-01 20:29:58'),
	(2, 'Overthinking Hoodie', 6900, '1stDrop', 'B,W', 'W', 0, 'img/2/B/1st%20post.png, img/2/W/2nd%20post.png', 'B=img/2/B/1st%20post.png\nW=img/2/W/2nd%20post.png', 'Everyday pullover, soft brushed interior.', '2026-04-01 20:29:58'),
	(3, 'Ein El Hassoud Hoodie', 6900, '1stDrop', 'B,W', 'W', 0, 'img/3/B/1st%20post.png, img/3/W/2nd%20post.png', 'B=img/3/B/1st%20post.png\nW=img/3/W/2nd%20post.png', 'Cooling cotton blend with roomy hood.', '2026-04-01 20:29:58'),
	(4, 'Im Just A Girl Hoodie', 6900, '1stDrop', 'P', 'W', 1, 'img/4/P/1st%20post.png', 'P=img/4/P/1st%20post.png', 'Water-repellent shell and soft lining.', '2026-04-01 20:29:58'),
	(5, 'Eyes Don\'t Lie Hoodie', 6900, '1stDrop', 'Br', 'W', 1, 'img/5/Br/1st%20post.png', 'Br=img/5/Br/1st%20post.png', 'Neutral tone, relaxed drop-shoulder fit.', '2026-04-01 20:29:58'),
	(6, '3rd Of December Hoodie', 6900, '1stDrop', 'W', 'W', 0, 'img/6/W/1st%20post.png', 'W=img/6/W/1st%20post.png', 'Full-zip with hidden phone pocket.', '2026-04-01 20:29:58'),
	(7, 'Try & Cry Hoodie', 6900, '1stDrop', 'Br,B,W', 'W', 0, 'img/7/Br/1st%20post.png, img/7/B/copy2.png, img/7/W/2nd%20post.png', 'Br=img/7/Br/1st%20post.png\nB=img/7/B/copy2.png\nW=img/7/W/2nd%20post.png', 'Triple-color drop with oversized relaxed fit.', '2026-04-01 20:29:58'),
	(8, 'Cairokee: Winter hoodie', 7500, 'CAIROKEE', 'B,W', 'W', 0, 'img/cairokee/1/B/main.jpg', 'B=img/cairokee/1/B/main.jpg,img/cairokee/1/B/2.jpg,img/cairokee/1/B/3.jpg\nW=img/cairokee/1/W/main.jpg,img/cairokee/1/W/2.jpg,img/cairokee/1/W/3.jpg', 'مش مجرد هودي… ده إحساس كايروكي 👁️🔥', '2026-04-01 20:34:26'),
	(16, 'Si lemhaf: Winter hoodie', 7500, 'LEMHAF', 'B', 'W', 0, 'img/lemhaf/1/B/main.jpg', 'B=img/lemhaf/1/B/main.jpg,img/lemhaf/1/B/2.jpg,img/lemhaf/1/B/3.jpg,img/lemhaf/1/B/4.jpg', 'If you know the vibe… you know. 🎧🔥\nSi Lemhaf inspired hoodie.', '2026-04-01 21:26:01'),
	(17, 'Upside Down: Hellfire Club', 7500, 'UPSIDE DOWN', 'B,W', 'B', 0, 'img/upsidedown/2/B/main.jpg', 'B=img/upsidedown/2/B/main.jpg\nW=img/upsidedown/2/W/main.jpg', 'From Hawkins to the streets 🔥\nHellfire Club vibes only 😈', '2026-04-01 21:30:29'),
	(18, 'Upside Down: Stranger Things', 7500, 'UPSIDE DOWN', 'B,Grey', 'Grey', 0, 'img/upsidedown/1/B/main.jpg', 'B=img/upsidedown/1/B/main.jpg,img/upsidedown/1/B/2.jpg,img/upsidedown/1/B/3.jpg\nGrey=img/upsidedown/1/Grey/main.jpg,img/upsidedown/1/Grey/2.jpg,img/upsidedown/1/Grey/3.jpg', 'Stranger Things vibes only 👁️', '2026-04-01 21:32:31');

-- Dumping structure for table store_waves.revenue_adjustments
CREATE TABLE IF NOT EXISTS `revenue_adjustments` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(180) NOT NULL,
  `amount_dt` decimal(10,2) NOT NULL,
  `created_by_user_id` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_revenue_adjustments_user` (`created_by_user_id`),
  CONSTRAINT `fk_revenue_adjustments_user` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table store_waves.revenue_adjustments: ~0 rows (approximately)
REPLACE INTO `revenue_adjustments` (`id`, `title`, `amount_dt`, `created_by_user_id`, `created_at`) VALUES
	(2, 'boxes', -10.00, 1, '2026-04-01 22:37:40');

-- Dumping structure for table store_waves.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `full_name` varchar(160) NOT NULL,
  `phone` varchar(30) NOT NULL,
  `address` text DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_phone` (`phone`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table store_waves.users: ~2 rows (approximately)
REPLACE INTO `users` (`id`, `full_name`, `phone`, `address`, `password_hash`, `role`, `created_at`) VALUES
	(1, 'mehdi makhlouf', '+21697843843', '', '$2a$10$0lLELvGzcDkf/UtSNEJWae5YgUrkg9bmQj3C.VUUwQRVZijdE3PUe', 'admin', '2026-03-30 18:24:58');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
